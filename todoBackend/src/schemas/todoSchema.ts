// JSON Schema for Todo validation in Fastify
// Ye schemas request ko validate karne ke liye hain (galat data nahi aane denge)

// POST /todos - Naya todo banane ke liye validation
export const createTodoSchema = {
  body: {  // Request body ko check karenge
    type: 'object',
    required: ['text'],  // 'text' field zaroori hai
    properties: {
      text: { 
        type: 'string',      // Text string hona chahiye
        minLength: 1,        // Kam se kam 1 character
        maxLength: 500       // Maximum 500 characters
      },
      parentId: { 
        type: 'number',      // Parent ID number hona chahiye
        nullable: true       // Ya phir null ho sakta hai (agar parent todo hai)
      }
    }
  },
  response: {  // Response ka format define kiya
    201: {     // 201 status code (Created) ke liye
      type: 'object',
      properties: {
        id: { type: 'number' },
        text: { type: 'string' },
        done: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        parentId: { type: ['number', 'null'] }  // Number ya null ho sakta hai
      }
    }
  }
}

// PUT /todos/:id - Todo update karne ke liye validation
export const updateTodoSchema = {
  params: {  // URL params ko check karenge
    type: 'object',
    required: ['id'],  // 'id' param zaroori hai
    properties: {
      id: { type: 'string' }  // ID string format mein aayega URL se
    }
  },
  body: {  // Request body ko check karenge
    type: 'object',
    // Required kuch nahi hai, jo bhi aaye update kar denge
    properties: {
      done: { type: 'boolean' }, // Done status (optional)
      text: { type: 'string' }   // Text update (optional)
    }
  }
}

// DELETE /todos/:id - Todo delete karne ke liye validation
export const deleteTodoSchema = {
  params: {  // URL params ko check karenge
    type: 'object',
    required: ['id'],  // 'id' param zaroori hai
    properties: {
      id: { type: 'string' }  // ID string format mein aayega
    }
  }
}

// GET /todos - Sare todos get karne ke liye response format
export const getTodosSchema = {
  response: {  // Response ka format define kiya
    200: {     // 200 status code (OK) ke liye
      type: 'array',  // Array of todos
      items: {        // Har item ka structure
        type: 'object',
        properties: {
          id: { type: 'number' },
          text: { type: 'string' },
          done: { type: 'boolean' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
          parentId: { type: ['number', 'null'] },
          // CRITICAL FIX: subTodos property add kiya (nested structure ke liye)
          subTodos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                text: { type: 'string' },
                done: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                parentId: { type: ['number', 'null'] },
                // Level 2 nesting (super child)
                subTodos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      text: { type: 'string' },
                      done: { type: 'boolean' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      parentId: { type: ['number', 'null'] },
                      // Level 3 nesting
                      subTodos: { type: 'array' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
