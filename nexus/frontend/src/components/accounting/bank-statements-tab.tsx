"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Loader2, Plus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface BankStatement {
  id: string;
  uploadDate: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  account: { name: string };
  lines: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    reference?: string;
    type: string;
    reconciled: boolean;
  }>;
}

export function BankStatementsTab() {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string }[]>([]);
  
  // Modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Manual Form
  const [accountId, setAccountId] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [manualType, setManualType] = useState("Debit");

  const fetchData = async () => {
    try {
      const [stmtsRes, accRes] = await Promise.all([
        api.get("accounting/bank-statements"),
        api.get("accounting/accounts")
      ]);
      setStatements(stmtsRes.data);
      // Filter only Bank accounts
      setAccounts(accRes.data.filter((a: { type: string }) => a.type.toLowerCase().includes("bank") || a.type.toLowerCase().includes("cash")));
    } catch {
      toast.error("Failed to load bank statements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleManualSubmit = async () => {
    if (!accountId || !manualAmount || !manualDate || !manualDesc) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      const amount = Number(manualAmount);
      await api.post("accounting/bank-statements", {
        accountId,
        startDate: manualDate,
        endDate: manualDate,
        openingBalance: 0,
        closingBalance: amount,
        lines: [{
          date: manualDate,
          description: manualDesc,
          amount: amount,
          reference: manualRef,
          type: manualType
        }]
      });
      toast.success("Transaction recorded");
      setIsManualModalOpen(false);
      setManualDesc("");
      setManualAmount("");
      fetchData();
    } catch {
      toast.error("Failed to save transaction");
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!accountId) {
      toast.error("Please select a bank account first");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").map(r => r.split(","));
      // Simple parsing assuming Date, Description, Amount, Ref, Type
      const parsedLines: Array<{ date: string; description: string; amount: number; reference: string; type: string }> = [];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length < 3) continue;
        parsedLines.push({
          date: cols[0],
          description: cols[1],
          amount: Number(cols[2]),
          reference: cols[3] || "",
          type: cols[4] || (Number(cols[2]) > 0 ? "Credit" : "Debit")
        });
      }

      if (parsedLines.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }

      try {
        await api.post("accounting/bank-statements", {
          accountId,
          startDate: parsedLines[0].date,
          endDate: parsedLines[parsedLines.length - 1].date,
          openingBalance: 0,
          closingBalance: 0,
          lines: parsedLines
        });
        toast.success("CSV Uploaded successfully");
        setIsCsvModalOpen(false);
        fetchData();
      } catch {
        toast.error("Failed to upload CSV");
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bank Statements</h2>
          <p className="text-sm text-slate-500">Record bank transfers, tag vendors, or bulk upload CSVs.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsManualModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" /> Manual Entry
          </Button>
          <Button onClick={() => setIsCsvModalOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" /> Upload CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {statements.map(stmt => (
          <Card key={stmt.id}>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">{stmt.account?.name || 'Unknown Account'}</CardTitle>
              <CardDescription>Statement ID: {stmt.id.slice(0, 8)} | Uploaded: {new Date(stmt.uploadDate).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description / Tags</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stmt.lines.map(line => (
                    <TableRow key={line.id}>
                      <TableCell>{new Date(line.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{line.description}</TableCell>
                      <TableCell>{line.reference || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${line.type === 'Credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {line.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold">₹{Number(line.amount).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {statements.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed">
            No bank statements found. Add a manual entry or upload a CSV to get started.
          </div>
        )}
      </div>

      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Bank Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (Add tags like #vendorName)</Label>
              <Input placeholder="e.g. Payment to Supplier #XYZ" value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input placeholder="UTR or Cheque No" value={manualRef} onChange={e => setManualRef(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={manualType} onValueChange={setManualType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Debit">Debit (Money Out)</SelectItem>
                    <SelectItem value="Credit">Credit (Money In)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualModalOpen(false)}>Cancel</Button>
            <Button onClick={handleManualSubmit}>Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCsvModalOpen} onOpenChange={setIsCsvModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload CSV Statement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Bank Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input type="file" accept=".csv" onChange={handleCsvUpload} />
              <p className="text-xs text-slate-500 mt-2">Format: Date, Description, Amount, Reference, Type(Credit/Debit)</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
