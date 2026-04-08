import type { Employee, Account } from '@/domain/entities/Staff'

export interface IStaffRepository {
  // Employees
  getEmployees(search?: string): Promise<Employee[]>
  addEmployee(form: {
    name: string; phone: string; birthday: string; position: string
  }): Promise<void>
  updateEmployee(id: string, form: {
    name: string; phone: string; birthday: string; position: string
  }): Promise<void>
  deleteEmployees(ids: string[]): Promise<void>

  // Accounts
  getAccounts(search?: string, callerRole?: string): Promise<Account[]>
  addAccount(form: {
    name: string; email: string; role: 'admin' | 'manager' | 'staff'; employee_id: string; callerRole?: string
  }): Promise<void>
  updateAccount(id: string, form: {
    name: string; email: string; role: 'admin' | 'manager' | 'staff'; callerRole?: string
  }): Promise<void>
  deleteAccounts(ids: string[], callerRole?: string): Promise<void>

  // PIN
  verifyPin(accountId: string, pin: string): Promise<boolean>
  updatePin(accountId: string, pinHash: string): Promise<void>
}