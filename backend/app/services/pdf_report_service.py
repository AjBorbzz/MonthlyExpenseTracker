from __future__ import annotations

import textwrap
from datetime import date

MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def _pdf_text(value: object) -> str:
    text = str(value)
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _money(value: float | int) -> str:
    return f"PHP {float(value):,.2f}"


class SimplePdf:
    def __init__(self, width: int = 612, height: int = 792) -> None:
        self.width = width
        self.height = height
        self.pages: list[list[str]] = []
        self.current: list[str] = []
        self.pages.append(self.current)

    def new_page(self) -> None:
        self.current = []
        self.pages.append(self.current)

    def text(self, x: float, y: float, value: object, size: int = 10, font: str = "F1") -> None:
        safe = _pdf_text(value)
        self.current.append(f"BT /{font} {size} Tf {x:.2f} {y:.2f} Td ({safe}) Tj ET")

    def line(self, x1: float, y1: float, x2: float, y2: float, width: float = 0.6) -> None:
        self.current.append(f"{width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def rect(self, x: float, y: float, width: float, height: float, fill_gray: float | None = None) -> None:
        if fill_gray is None:
            self.current.append(f"{x:.2f} {y:.2f} {width:.2f} {height:.2f} re S")
        else:
            self.current.append(f"q {fill_gray:.2f} g {x:.2f} {y:.2f} {width:.2f} {height:.2f} re f Q")

    def render(self) -> bytes:
        page_count = len(self.pages)
        objects: list[bytes] = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        ]

        page_ids = []
        for index, commands in enumerate(self.pages):
            page_id = 5 + index * 2
            content_id = page_id + 1
            page_ids.append(page_id)
            stream = "\n".join(commands).encode("latin-1", "replace")
            objects.append(
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.width} {self.height}] "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_id} 0 R >>".encode("latin-1")
            )
            objects.append(b"<< /Length " + str(len(stream)).encode("latin-1") + b" >>\nstream\n" + stream + b"\nendstream")

        kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
        objects[1] = f"<< /Type /Pages /Kids [{kids}] /Count {page_count} >>".encode("latin-1")

        output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for object_id, body in enumerate(objects, start=1):
            offsets.append(len(output))
            output.extend(f"{object_id} 0 obj\n".encode("latin-1"))
            output.extend(body)
            output.extend(b"\nendobj\n")

        xref_start = len(output)
        output.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
        output.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            output.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
        output.extend(
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("latin-1")
        )
        return bytes(output)


class ReportPainter:
    def __init__(self) -> None:
        self.pdf = SimplePdf()
        self.margin = 48
        self.y = 744

    def ensure_space(self, height: int) -> None:
        if self.y - height < 48:
            self.pdf.new_page()
            self.y = 744

    def title(self, text: str) -> None:
        self.pdf.text(self.margin, self.y, text, size=20, font="F2")
        self.y -= 26

    def subtitle(self, text: str) -> None:
        self.pdf.text(self.margin, self.y, text, size=10)
        self.y -= 22

    def section(self, text: str) -> None:
        self.ensure_space(40)
        self.y -= 8
        self.pdf.text(self.margin, self.y, text, size=13, font="F2")
        self.y -= 10
        self.pdf.line(self.margin, self.y, self.pdf.width - self.margin, self.y)
        self.y -= 18

    def metric_grid(self, metrics: list[tuple[str, str]]) -> None:
        self.ensure_space(116)
        box_width = 165
        box_height = 44
        gap = 12
        for index, (label, value) in enumerate(metrics):
            column = index % 3
            row = index // 3
            x = self.margin + column * (box_width + gap)
            y = self.y - row * (box_height + gap) - box_height
            self.pdf.rect(x, y, box_width, box_height, fill_gray=0.96)
            self.pdf.text(x + 10, y + 26, label, size=8)
            self.pdf.text(x + 10, y + 10, value, size=12, font="F2")
        self.y -= 112

    def bullets(self, rows: list[str], empty_text: str) -> None:
        rows = rows or [empty_text]
        for item in rows:
            wrapped = textwrap.wrap(item, width=88) or [""]
            self.ensure_space(14 * len(wrapped) + 4)
            self.pdf.text(self.margin, self.y, "-", size=10)
            for line in wrapped:
                self.pdf.text(self.margin + 14, self.y, line, size=10)
                self.y -= 14
            self.y -= 2

    def table(self, headers: list[str], rows: list[list[str]], widths: list[int], empty_text: str) -> None:
        if not rows:
            rows = [[empty_text] + [""] * (len(headers) - 1)]
        self.ensure_space(38)
        x = self.margin
        self.pdf.rect(self.margin, self.y - 16, sum(widths), 20, fill_gray=0.92)
        for header, width in zip(headers, widths):
            self.pdf.text(x + 4, self.y - 10, header, size=8, font="F2")
            x += width
        self.y -= 24
        for row in rows:
            self.ensure_space(18)
            x = self.margin
            for value, width in zip(row, widths):
                clipped = str(value)
                if len(clipped) > max(8, width // 5):
                    clipped = clipped[: max(8, width // 5) - 1] + "."
                self.pdf.text(x + 4, self.y, clipped, size=8)
                x += width
            self.pdf.line(self.margin, self.y - 5, self.margin + sum(widths), self.y - 5, width=0.25)
            self.y -= 16


def build_dashboard_pdf(summary: dict, family_name: str, user_name: str, month: int, year: int) -> bytes:
    report = ReportPainter()
    period = f"{MONTH_NAMES[month - 1]} {year}"

    report.title("Monthly Family Expense Report")
    report.subtitle(f"{family_name} | {period} | Generated for {user_name} on {date.today().isoformat()}")
    report.metric_grid(
        [
            ("Total income", _money(summary["total_income"])),
            ("Total expense", _money(summary["total_expense"])),
            ("Total saved", _money(summary["total_saved"])),
            ("Savings rate", f"{summary['savings_rate']}%"),
            ("Health score", f"{summary['budget_health_score']['score']} - {summary['budget_health_score']['label']}"),
            ("Projected savings", _money(summary["projected_month_end_savings"])),
        ]
    )

    report.section("Rule-Based Insights")
    report.bullets(summary.get("rule_based_insights", []), "No insights for this period.")

    report.section("Budget vs Actual")
    budget_rows = [
        [
            row["category_name"],
            _money(row["allocated_budget"]),
            _money(row["actual_spent"]),
            _money(row["remaining_budget"]),
            f"{row['percentage_used']:.1f}%",
            row["rollover_indicator"],
        ]
        for row in summary.get("budget_vs_actual", [])
    ]
    report.table(
        ["Category", "Budget", "Actual", "Remaining", "Used", "Status"],
        budget_rows,
        [116, 78, 78, 82, 58, 92],
        "No budgets for this period.",
    )

    report.section("Top Expense Categories")
    top_rows = [[row["name"], _money(row["total"])] for row in summary.get("top_expense_categories", [])]
    report.table(["Category", "Total"], top_rows, [320, 120], "No expenses for this period.")

    report.section("Recent Expenses")
    recent_rows = [
        [
            str(row["expense_date"]),
            row["description"],
            row.get("category_name") or "-",
            row.get("user_name") or "-",
            _money(row["amount"]),
        ]
        for row in summary.get("recent_expenses", [])
    ]
    report.table(["Date", "Description", "Category", "Added by", "Amount"], recent_rows, [72, 168, 92, 92, 80], "No recent expenses.")

    report.section("Recurring Due Soon")
    due_rows = [
        [
            row["name"],
            str(row["next_due_date"]),
            row.get("category_name") or "-",
            _money(row["amount"]),
        ]
        for row in summary.get("recurring_expenses_due_soon", [])
    ]
    report.table(["Name", "Due date", "Category", "Amount"], due_rows, [170, 92, 148, 94], "No recurring expenses due soon.")

    return report.pdf.render()
