// Todo Types for API requests and responses
// Ye sare types API ke request aur response ke liye hain

// Jab naya todo create karna ho to ye data bhejenge
export interface CreateTodoRequest {
  text: string          // Todo ka text/title (required)
  parentId?: number     // Agar ye kisi ka child hai to parent ka ID (optional)
}

// Jab todo update karna ho (text ya done status) to ye data bhejenge
export interface UpdateTodoRequest {
  done?: boolean        // Todo complete hua ya nahi (optional)
  text?: string         // Todo ka text (optional)
}

// API se jo response aayega wo is format mein hoga
export interface TodoResponse {
  id: number            // Todo ka unique ID
  text: string          // Todo ka text/title
  done: boolean         // Complete hai ya nahi
  createdAt: Date       // Kab banaya gaya
  updatedAt: Date       // Last kab update hua
  parentId: number | null  // Parent ka ID (agar child hai to), null agar parent hai
  subTodos?: TodoResponse[] // Iske children (optional, nested structure)
}

// Agar error aaye to ye format mein response milega
export interface ErrorResponse {
  error: string         // Error message
}
