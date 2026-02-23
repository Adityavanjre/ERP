"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import React from "react";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number;
    onChange: (val: number) => void;
    allowNegative?: boolean;
    decimal?: boolean;
}

export function NumericInput({
    value,
    onChange,
    className,
    allowNegative = false,
    decimal = false,
    ...props
}: NumericInputProps) {
    const [displayValue, setDisplayValue] = React.useState<string>(value === 0 ? "" : value.toString());

    // Sync external value changes to display
    React.useEffect(() => {
        const numDisplay = Number(displayValue);
        if (numDisplay !== value || (value === 0 && displayValue === "0")) {
            // Only update display if the numeric value actually changed, 
            // to avoid resetting the cursor while user is typing "0." or "0.0"
            if (value === 0 && !displayValue) {
                setDisplayValue("");
            } else {
                setDisplayValue(value.toString());
            }
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;

        // 1. Strip non-numeric
        if (decimal) {
            val = val.replace(/[^0-9.-]/g, '');
        } else {
            val = val.replace(/[^0-9-]/g, '');
        }

        // 2. Prevent multiple decimals
        const parts = val.split('.');
        if (parts.length > 2) {
            val = parts[0] + '.' + parts.slice(1).join('');
        }

        // 3. Handle negative sign
        if (!allowNegative) {
            val = val.replace('-', '');
        }

        // 4. Smart leading zero handling: "001" -> "1", but "0." is fine
        if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
            val = val.replace(/^0+/, '');
            if (val === "" || val.startsWith('.')) val = '0' + val;
        }

        setDisplayValue(val);

        // Parse and notify
        const parsed = decimal ? parseFloat(val) : parseInt(val, 10);
        if (!isNaN(parsed)) {
            onChange(parsed);
        } else if (val === "" || val === "-") {
            onChange(0);
        }
    };

    const handleBlur = () => {
        // Cleanup formatting on blur
        if (displayValue === "" || displayValue === "-") {
            setDisplayValue("");
            onChange(0);
            return;
        }

        const parsed = decimal ? parseFloat(displayValue) : parseInt(displayValue, 10);
        if (isNaN(parsed)) {
            setDisplayValue("");
            onChange(0);
        } else {
            // Final sanitization: remove trailing dots or clean up ".5" -> "0.5"
            let finalStr = parsed.toString();
            setDisplayValue(finalStr);
            onChange(parsed);
        }
    };

    return (
        <Input
            {...props}
            type="text" // Use text for better control over leading zeros
            inputMode="decimal"
            className={cn("font-mono", className)}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
}
