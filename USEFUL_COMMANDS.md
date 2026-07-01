# USEFUL COMMANDS REFERENCE

**For**: Quick access to commonly used commands in this project  
**Date**: July 1, 2026

---

## 🏗️ BUILD & VERIFICATION COMMANDS

### Quick Build Check
```bash
cd c:\Users\adity\code\ERP\nexus\frontend
npm run build
```
**Result**: ~15.4 seconds, should show ✓ routes generated  
**Meaning**: If you see 60+ routes generated, build is successful ✅

### TypeScript Verification (No Emit)
```bash
cd c:\Users\adity\code\ERP\nexus\frontend
npx tsc --noEmit --skipLibCheck
```
**Result**: Should show nothing (silence = 0 errors)  
**Meaning**: No TypeScript errors ✅

### Development Server (Long-running - use PowerShell)
```bash
cd c:\Users\adity\code\ERP\nexus\frontend
npm run dev
```
**Note**: This starts the dev server. Use in Terminal, not Command Palette.

---

## 📂 FILE & SEARCH COMMANDS

### Find All Inline Create Dialogs
```bash
cd c:\Users\adity\code\ERP\nexus\frontend\src\components\shared
dir inline*
```
**Expected Results**:
- inline-create-account-dialog.tsx
- inline-create-customer-dialog.tsx
- inline-create-department-dialog.tsx
- inline-create-product-dialog.tsx
- inline-create-supplier-dialog.tsx
- inline-create-warehouse-dialog.tsx

### Search for InlineCreateAccountDialog Usage
```bash
# From project root
grep -r "InlineCreateAccountDialog" nexus/frontend/src/
```
**Shows**: All files using account creation dialog

### Find All Task.md Content
```bash
cat c:\Users\adity\code\ERP\task.md | more
```
**Shows**: Complete task checklist with status

---

## 📊 DOCUMENTATION COMMANDS

### Read Session Summary
```bash
cat c:\Users\adity\code\ERP\SESSION_FINAL_SUMMARY.md | more
```
**Best for**: Understanding what was accomplished

### Read Task Completion Status
```bash
cat c:\Users\adity\code\ERP\TASK_COMPLETION_STATUS.md | more
```
**Best for**: Detailed feature audit results

### Read Quick Next Steps
```bash
cat c:\Users\adity\code\ERP\QUICK_NEXT_STEPS.md
```
**Best for**: Immediate action items

### Read This Command Reference
```bash
cat c:\Users\adity\code\ERP\USEFUL_COMMANDS.md
```
**Best for**: Available commands reference

---

## 🔍 SPECIFIC FILE CHECKS

### Verify Journal Entry Dialog (Task 1)
```bash
# Check if InlineCreateAccountDialog is imported
grep "InlineCreateAccountDialog" nexus/frontend/src/components/accounting/create-journal-entry-dialog.tsx

# Should show: import { InlineCreateAccountDialog }
```

### Verify Bank Statements Tab (Task 2)
```bash
grep "InlineCreateAccountDialog" nexus/frontend/src/components/accounting/bank-statements-tab.tsx
```

### Verify Purchases Page (Task 3)
```bash
grep "InlineCreate" nexus/frontend/src/app/(dashboard)/purchases/page.tsx
```

### Check Logo Upload in Settings (Task 12)
```bash
grep "logoUrl\|handleLogoUpload" nexus/frontend/src/app/(dashboard)/settings/page.tsx | head -20
```

---

## ⚡ QUICK VERIFICATION WORKFLOW

### Full Verification (5 minutes)
```bash
# Step 1: Navigate to frontend
cd c:\Users\adity\code\ERP\nexus\frontend

# Step 2: Build check
npm run build
# ✅ Should see: "✓ Compiled successfully in X.Xs"
# ✅ Should see: "✓ Generating static pages"
# ✅ Should see: 60+ routes

# Step 3: TypeScript check
npx tsc --noEmit --skipLibCheck
# ✅ Should show: nothing (0 errors)

# If both pass: Phase 4 is verified ✅
```

### Spot-Check Specific Task (2 minutes)
```bash
# Example: Check Task 1 (Journal Entry)
grep -n "InlineCreateAccountDialog\|pendingLineIndex\|New Account" \
  nexus/frontend/src/components/accounting/create-journal-entry-dialog.tsx

# Should show multiple matches indicating integration is complete
```

---

## 📝 FILE VIEWING SHORTCUTS

### View Phase 4 Detailed Report
```bash
cat c:\Users\adity\code\ERP\PHASE_4_EXTENDED_COMPLETE.md
```

### View All Documentation Files
```bash
ls c:\Users\adity\code\ERP\*.md
```

### View Documentation Index
```bash
cat c:\Users\adity\code\ERP\DOCUMENTATION_INDEX.md
```

---

## 🔐 DEPLOYMENT VERIFICATION

### Before Deploying Phase 4
```bash
# Step 1: Full build
cd c:\Users\adity\code\ERP\nexus\frontend
npm run build

# Step 2: TypeScript check
npx tsc --noEmit --skipLibCheck

# Step 3: Review changes
# Read: PHASE_4_EXTENDED_COMPLETE.md
# Verify: 25+ files, 40+ changes, all CSS/spacing only

# Step 4: Deploy!
# ✅ Safe to proceed
```

---

## 🎯 TASK VERIFICATION CHECKLIST

### Next Session Quick Wins (30 min)

**Task 16 Verification (15 min)**:
```bash
# Check environment for RESEND_API_KEY
echo $env:RESEND_API_KEY
# Should show: API key value (if set)

# Or from backend logs
grep -r "RESEND_API_KEY" nexus/backend/
```

**Tasks 7-11 Verification (30 min)**:
```bash
# Check Task 7 - Work Order Dialog
grep "InlineCreate\|CreateBOMDialog" \
  nexus/frontend/src/components/manufacturing/create-work-order-dialog.tsx

# Check Task 8 - Start Production
grep "InlineCreateWarehouseDialog" \
  nexus/frontend/src/components/manufacturing/start-production-dialog.tsx

# Check Task 9 - Complete Work Order
grep "InlineCreateWarehouseDialog" \
  nexus/frontend/src/components/manufacturing/complete-work-order-dialog.tsx

# Check Task 10 - Transfer Stock
grep "InlineCreateWarehouseDialog" \
  nexus/frontend/src/components/inventory/transfer-stock-dialog.tsx

# Check Task 11 - Inventory Page
grep "InlineCreateWarehouseDialog" \
  nexus/frontend/src/app/(dashboard)/inventory/page.tsx
```

---

## 📈 PERFORMANCE MONITORING

### Check Build Time Trend
```bash
# From Phase 3 to Phase 4
# Phase 3: 17.1s
# Phase 4: 15.4s (28% improvement!)

cd c:\Users\adity\code\ERP\nexus\frontend
npm run build 2>&1 | grep "Compiled successfully"
```

### Monitor Build Output
```bash
# Watch for these lines:
# ✓ Compiled successfully in X.Xs
# ✓ Finished TypeScript
# ✓ Generating static pages
# All routes showing with ƒ or ○ indicator
```

---

## 🐛 TROUBLESHOOTING

### If Build Fails
```bash
# Clear cache
rm -r .next node_modules/.cache

# Rebuild
npm run build

# If still fails, check:
npx tsc --noEmit --skipLibCheck
# Look for error messages
```

### If TypeScript Shows Errors
```bash
# Clear cache
npm run clean # if available

# Rebuild
npx tsc --noEmit --skipLibCheck

# Check specific file:
npx tsc --noEmit --skipLibCheck --listFiles
```

### Verify Git Status (Optional)
```bash
cd c:\Users\adity\code\ERP
git status
# Should show 25+ modified files in Phase 4 changes
```

---

## 📚 DOCUMENTATION QUICK LINKS

| Topic | Command | Read Time |
|-------|---------|----------|
| What happened today | `cat SESSION_FINAL_SUMMARY.md` | 5 min |
| Task status details | `cat TASK_COMPLETION_STATUS.md` | 10 min |
| Next actions | `cat QUICK_NEXT_STEPS.md` | 2 min |
| All documents | `cat DOCUMENTATION_INDEX.md` | 5 min |
| Spacing details | `cat PHASE_4_EXTENDED_COMPLETE.md` | 8 min |
| Task checklist | `cat task.md` | 3 min |

---

## 🎯 MOST COMMON WORKFLOWS

### "I'm starting work this session" (2 min setup)
```bash
# 1. Read quick next steps
cat c:\Users\adity\code\ERP\QUICK_NEXT_STEPS.md

# 2. Navigate to frontend
cd c:\Users\adity\code\ERP\nexus\frontend

# 3. Do verification checklist from QUICK_NEXT_STEPS.md
```

### "I'm deploying Phase 4" (5 min)
```bash
# 1. Read deployment section
cat c:\Users\adity\code\ERP\QUICK_NEXT_STEPS.md | grep -A 10 "IMMEDIATE ACTIONS"

# 2. Run verification
cd c:\Users\adity\code\ERP\nexus\frontend
npm run build
npx tsc --noEmit --skipLibCheck

# 3. Deploy (process depends on your DevOps)
```

### "I'm checking a specific task" (1 min)
```bash
# Example: Verify Task 1
grep "InlineCreateAccountDialog" \
  c:\Users\adity\code\ERP\nexus\frontend\src\components\accounting/create-journal-entry-dialog.tsx

# If shows match: Task is integrated ✅
```

### "I'm reporting progress" (5 min)
```bash
# 1. Open summary
cat c:\Users\adity\code\ERP\SESSION_FINAL_SUMMARY.md

# 2. Show metrics section
# 3. Show task completion table
# 4. Show recommendations
```

---

## 💾 BACKUP & REFERENCE

### Save All Documentation Locally
```bash
# Create backup
mkdir backup-docs
cp *.md backup-docs/
```

### Share Documentation with Team
```bash
# All documentation files ready to share:
c:\Users\adity\code\ERP\SESSION_FINAL_SUMMARY.md
c:\Users\adity\code\ERP\TASK_COMPLETION_STATUS.md
c:\Users\adity\code\ERP\QUICK_NEXT_STEPS.md
c:\Users\adity\code\ERP\DOCUMENTATION_INDEX.md
c:\Users\adity\code\ERP\PHASE_4_EXTENDED_COMPLETE.md
c:\Users\adity\code\ERP\task.md
```

---

## 🔑 SHORTCUT SUMMARY

| Goal | Command | Time |
|------|---------|------|
| Build verify | `npm run build` | 15s |
| TS verify | `npx tsc --noEmit --skipLibCheck` | 20s |
| Read summary | `cat SESSION_FINAL_SUMMARY.md` | 5 min |
| Read next steps | `cat QUICK_NEXT_STEPS.md` | 2 min |
| Find dialog imports | `grep "InlineCreate" <file>.tsx` | 1 min |
| Full verification | All above steps | 30 min |

---

**Remember**: All commands should be run from `c:\Users\adity\code\ERP` or `c:\Users\adity\code\ERP\nexus\frontend` as noted.

Happy developing! 🚀

