/**
 * Shared Microservices Contracts & Domain Models
 */

export type UserRole = 'USER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN';
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'ABANDONED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface AuthUserDTO {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface ServiceContext {
  correlationId: string;
  authenticatedUserId?: string;
  authenticatedUserRole?: UserRole;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  correlationId: string;
  timestamp: string;
}
