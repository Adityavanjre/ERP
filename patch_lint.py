import re

with open('nexus/frontend/src/components/sales/rapid/CheckoutSidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Settings, Plus, CreditCard, Banknote, Landmark, Smartphone, FileText, Upload, Check, Trash2, Printer, CheckCircle2 } from \"lucide-react\";",
                          "import { Plus, CreditCard, Banknote, Landmark, Smartphone, FileText, Upload, Check, Trash2, Printer, CheckCircle2 } from \"lucide-react\";")

content = content.replace("customerName,", "/* customerName, */")
content = content.replace("  customerName: string;", "  customerName?: string;")

with open('nexus/frontend/src/components/sales/rapid/CheckoutSidebar.tsx', 'w') as f:
    f.write(content)
