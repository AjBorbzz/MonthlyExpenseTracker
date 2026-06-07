"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>();
  const load = () => api.get<Category[]>("/categories").then(setCategories);
  useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Categories</h1><p className="text-sm text-muted-foreground">Organize household spending buckets.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing(undefined)}><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle></DialogHeader><CategoryForm initial={editing} onSubmit={async (payload) => { editing ? await api.put(`/categories/${editing.id}`, payload) : await api.post("/categories", payload); setOpen(false); load(); }} /></DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>Active Categories</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Color</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.description || "-"}</TableCell>
                <TableCell><span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded" style={{ background: category.color ?? "#0f766e" }} />{category.icon}</span></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(category); setOpen(true); }} aria-label="Edit category"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/categories/${category.id}`); load(); }} aria-label="Delete category"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
          {!categories.length ? <p className="py-6 text-sm text-muted-foreground">No categories yet.</p> : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
