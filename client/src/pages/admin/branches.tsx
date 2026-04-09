import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Loader2 } from "lucide-react";
import type { Branch } from "@shared/schema";

export default function BranchesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "" });

  const { data: branches = [], isLoading } = useQuery<Branch[]>({ queryKey: ["/api/branches"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/branches", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); setOpen(false); toast({ title: "تم إنشاء الفرع بنجاح" }); },
    onError: () => toast({ title: "خطأ", description: "فشل إنشاء الفرع", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/branches/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); setOpen(false); setEditBranch(null); toast({ title: "تم تعديل الفرع بنجاح" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/branches/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/branches"] }); toast({ title: "تم حذف الفرع" }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editBranch) {
      updateMutation.mutate({ id: editBranch.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openCreate = () => {
    setEditBranch(null);
    setForm({ name: "", code: "", address: "", phone: "" });
    setOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditBranch(branch);
    setForm({ name: branch.name, code: branch.code, address: branch.address || "", phone: branch.phone || "" });
    setOpen(true);
  };

  return (
    <div className="p-6 h-full overflow-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">إدارة الفروع</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="button-add-branch"><Plus className="w-4 h-4 ml-2" />إضافة فرع</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>{editBranch ? "تعديل الفرع" : "إضافة فرع جديد"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>اسم الفرع</Label><Input data-testid="input-branch-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><Label>كود الفرع</Label><Input data-testid="input-branch-code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required /></div>
              <div><Label>العنوان</Label><Input data-testid="input-branch-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div><Label>الهاتف</Label><Input data-testid="input-branch-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <Button type="submit" className="w-full" data-testid="button-submit-branch">{editBranch ? "حفظ التعديلات" : "إنشاء الفرع"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map(branch => (
                  <TableRow key={branch.id} data-testid={`row-branch-${branch.id}`}>
                    <TableCell className="font-mono">{branch.code}</TableCell>
                    <TableCell>{branch.name}</TableCell>
                    <TableCell>{branch.address || "-"}</TableCell>
                    <TableCell>{branch.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(branch)} data-testid={`button-edit-branch-${branch.id}`}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(branch.id)} data-testid={`button-delete-branch-${branch.id}`}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {branches.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد فروع</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الفرع؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 flex-row-reverse">
            <AlertDialogAction data-testid="button-confirm-delete-branch" onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>حذف</AlertDialogAction>
            <AlertDialogCancel data-testid="button-cancel-delete-branch">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
