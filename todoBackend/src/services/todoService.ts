// Prisma client import kar rahe hain database operations ke liye
import { PrismaClient } from '@prisma/client'

// Fresh Prisma client instance (singleton issue fix karne ke liye)
const prisma = new PrismaClient()


// TodoService class - Ye sare database operations handle karega
export class TodoService {
  // Sare todos get karne ka function (nested structure ke saath)
  async getAllTodos(userId: number) {
    console.log('🔍 getAllTodos called for user:', userId)
    
    // Database se sare parent todos fetch karo jo is user ke hain
    const todos = await prisma.todo.findMany({
      where: { 
        parentId: null,
        userId: userId // Ensure user ID matches
      }, 
      orderBy: { createdAt: 'desc' }, // Latest pehle dikhao
      include: {  // Children bhi include karo (3 levels tak)
        subTodos: {  // Level 1 children
          include: {
            subTodos: {  // Level 2 children (super child)
              include: {
                subTodos: true // Level 3 children
              }
            }
          }
        }
      }
    })
    
    return todos
  }

  // Naya todo create karne ka function
  async createTodo(text: string, userId: number, parentId?: number) {
    // Database mein naya todo save karo
    return await prisma.todo.create({
      data: {
        text,  // Todo ka text
        userId, // Kis user ka hai
        parentId: parentId || null  // Parent ID (agar hai to wo, nahi to null)
      },
      include: {  // Response mein nested structure bhejo
        subTodos: {
          include: {
            subTodos: {
              include: {
                subTodos: true
              }
            }
          }
        }
      }
    })
  }

  // Todo update karne ka function (text ya done status)
  async updateTodo(id: number, userId: number, data: { text?: string; done?: boolean }) {
    // Database mein todo update karo (only if it belongs to user)
    return await prisma.todo.update({
      where: { 
        id,
        userId // Security check: banda apna hi todo update kar paye
      },  
      data,  // Jo bhi fields aaye hain unhe update karo (text, done or both)
      include: {  // Response mein nested structure bhi bhejo
        subTodos: {
          include: {
            subTodos: {
              include: {
                subTodos: true
              }
            }
          }
        }
      }
    })
  }

  // Todo delete karne ka function
  async deleteTodo(id: number, userId: number) {
    // Database se todo delete karo (only if it belongs to user)
    return await prisma.todo.delete({
      where: { 
        id,
        userId // Security check
      }  
    })
    // Note: Schema mein onDelete: Cascade hai, to children bhi auto delete ho jayenge
  }
}
