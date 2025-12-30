export interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  parentId: number | null;
  subTodos?: Todo[]; // Nested todos (children)
  version?: number; // Etag version
  owner?: {
    id: number;
    email: string;
    name: string | null;
  };
}

// Todo create karne ke liye request data
export interface CreateTodoRequest {
  text: string;
  parentId?: number;
}

// Todo update karne ke liye request data
export interface UpdateTodoRequest {
  done?: boolean; // Done status update (optional)
  text?: string; // Text update (optional)
}
