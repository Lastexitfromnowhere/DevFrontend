import React from 'react';
import { cn } from '@/lib/utils';
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}
export function Table({ 
  children, 
  className,
  ...props 
}: TableProps) {
  return (
    <table
      className={cn('w-full border-collapse', className)}
      {...props}
    >
      {children}
    </table>
  );
}
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}
export function TableHeader({ 
  children, 
  className,
  ...props 
}: TableHeaderProps) {
  return (
    <thead
      className={cn('bg-green-900/10', className)}
      {...props}
    >
      {children}
    </thead>
  );
}
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}
export function TableBody({ 
  children, 
  className,
  ...props 
}: TableBodyProps) {
  return (
    <tbody
      className={cn('', className)}
      {...props}
    >
      {children}
    </tbody>
  );
}
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}
export function TableRow({ 
  children, 
  className,
  ...props 
}: TableRowProps) {
  return (
    <tr
      className={cn('border-b border-green-800/20 hover:bg-green-900/5', className)}
      {...props}
    >
      {children}
    </tr>
  );
}
interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}
export function TableHead({ 
  children, 
  className,
  ...props 
}: TableHeadProps) {
  return (
    <th
      className={cn('px-4 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider', className)}
      {...props}
    >
      {children}
    </th>
  );
}
interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}
export function TableCell({ 
  children, 
  className,
  ...props 
}: TableCellProps) {
  return (
    <td
      className={cn('px-4 py-3 text-sm', className)}
      {...props}
    >
      {children}
    </td>
  );
}
