/**
 * OpenAPI/Swagger Specification for IC SPICY Co-op Logistics API
 * 
 * Complete API documentation with examples and schemas
 */

export const LOGISTICS_API_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "IC SPICY Co-op Logistics API",
    description: `
      Comprehensive API for managing IC SPICY cooperative logistics operations.
      
      ## Features
      - **Secure Authentication**: JWT tokens and API key authentication
      - **Role-Based Access**: Different permission levels for users
      - **Order Management**: Complete order lifecycle management
      - **Inventory Tracking**: Real-time inventory management
      - **Transaction Processing**: Financial transaction handling
      - **Analytics & Reporting**: Business intelligence and reporting
      
      ## Authentication
      All endpoints require authentication using either:
      - **API Key**: Include \`X-API-Key\` header for service authentication
      - **JWT Token**: Include \`Authorization: Bearer <token>\` header for user authentication
      
      ## Rate Limiting
      - 1000 requests per hour for authenticated users
      - 100 requests per hour for unauthenticated requests
      
      ## Error Handling
      All errors return standardized JSON responses with error codes and messages.
    `,
    version: "1.0.0",
    contact: {
      name: "IC SPICY Co-op Development Team",
      url: "https://icspicy-logistics-ynt.caffeine.xyz",
      email: "dev@icspicy.com"
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT"
    }
  },
  servers: [
    {
      url: "https://icspicy-logistics-ynt.caffeine.xyz/api/v1",
      description: "Production server"
    },
    {
      url: "https://staging-icspicy-logistics-ynt.caffeine.xyz/api/v1",
      description: "Staging server"
    }
  ],
  
  // Security schemes
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key for service-to-service authentication"
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token for user authentication"
      }
    },
    
    // Reusable schemas
    schemas: {
      // Error response schema
      Error: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: {
            type: "boolean",
            example: false
          },
          error: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Resource not found"
              },
              status: {
                type: "integer",
                example: 404
              },
              details: {
                type: "object",
                additionalProperties: true
              },
              timestamp: {
                type: "string",
                format: "date-time",
                example: "2024-01-01T12:00:00Z"
              }
            }
          }
        }
      },
      
      // Success response wrapper
      SuccessResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: {
            type: "boolean",
            example: true
          },
          data: {
            type: "object",
            additionalProperties: true
          },
          timestamp: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:00:00Z"
          }
        }
      },
      
      // Pagination schema
      Pagination: {
        type: "object",
        properties: {
          page: {
            type: "integer",
            minimum: 1,
            example: 1
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            example: 20
          },
          total: {
            type: "integer",
            example: 150
          },
          totalPages: {
            type: "integer",
            example: 8
          },
          hasNext: {
            type: "boolean",
            example: true
          },
          hasPrev: {
            type: "boolean",
            example: false
          }
        }
      },
      
      // Order schemas
      Order: {
        type: "object",
        required: ["id", "items", "customer", "total", "status"],
        properties: {
          id: {
            type: "string",
            pattern: "^ORD-[A-Z0-9]{8,}$",
            example: "ORD-ABC123DEF456"
          },
          items: {
            type: "array",
            items: {
              $ref: "#/components/schemas/OrderItem"
            }
          },
          customer: {
            $ref: "#/components/schemas/Customer"
          },
          shipping: {
            $ref: "#/components/schemas/ShippingAddress"
          },
          billing: {
            $ref: "#/components/schemas/BillingAddress"
          },
          total: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 125.50
          },
          subtotal: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 115.50
          },
          tax: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 10.00
          },
          shipping_cost: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 0.00
          },
          status: {
            type: "string",
            enum: ["pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refunded"],
            example: "confirmed"
          },
          tracking_number: {
            type: "string",
            example: "1Z999AA1234567890"
          },
          notes: {
            type: "string",
            example: "Handle with care - fragile items"
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:00:00Z"
          },
          updated_at: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:30:00Z"
          },
          source: {
            type: "string",
            example: "ic-spicy-frontend"
          }
        }
      },
      
      OrderItem: {
        type: "object",
        required: ["id", "variety", "size", "price", "quantity"],
        properties: {
          id: {
            type: "string",
            example: "item-123-456"
          },
          product_id: {
            type: "string",
            example: "PROD-CR-LARGE"
          },
          variety: {
            type: "string",
            example: "Carolina Reaper"
          },
          size: {
            type: "string",
            example: "Large"
          },
          unit: {
            type: "string",
            example: "pot"
          },
          price: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 45.00
          },
          quantity: {
            type: "integer",
            minimum: 1,
            example: 2
          },
          subtotal: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 90.00
          },
          category: {
            type: "string",
            example: "plants"
          }
        }
      },
      
      Customer: {
        type: "object",
        required: ["principal"],
        properties: {
          principal: {
            type: "string",
            example: "rdmx6-jaaaa-aaaah-qcaiq-cai"
          },
          email: {
            type: "string",
            format: "email",
            example: "customer@example.com"
          },
          phone: {
            type: "string",
            example: "+1-555-123-4567"
          }
        }
      },
      
      ShippingAddress: {
        type: "object",
        required: ["firstName", "lastName", "address", "city", "state", "zipCode", "country"],
        properties: {
          firstName: {
            type: "string",
            example: "John"
          },
          lastName: {
            type: "string",
            example: "Doe"
          },
          email: {
            type: "string",
            format: "email",
            example: "john.doe@example.com"
          },
          phone: {
            type: "string",
            example: "+1-555-123-4567"
          },
          address: {
            type: "string",
            example: "123 Main Street"
          },
          city: {
            type: "string",
            example: "Anytown"
          },
          state: {
            type: "string",
            example: "CA"
          },
          zipCode: {
            type: "string",
            example: "12345"
          },
          country: {
            type: "string",
            example: "United States"
          }
        }
      },
      
      BillingAddress: {
        allOf: [
          {
            $ref: "#/components/schemas/ShippingAddress"
          },
          {
            type: "object",
            properties: {
              sameAsShipping: {
                type: "boolean",
                example: true
              }
            }
          }
        ]
      },
      
      // Transaction schemas
      Transaction: {
        type: "object",
        required: ["id", "order_id", "amount", "type", "status"],
        properties: {
          id: {
            type: "string",
            pattern: "^TXN-[A-Z0-9]{8,}$",
            example: "TXN-XYZ789ABC123"
          },
          order_id: {
            type: "string",
            example: "ORD-ABC123DEF456"
          },
          amount: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 125.50
          },
          currency: {
            type: "string",
            example: "USD"
          },
          type: {
            type: "string",
            enum: ["payment", "refund", "adjustment", "fee"],
            example: "payment"
          },
          status: {
            type: "string",
            enum: ["pending", "processing", "completed", "failed", "cancelled"],
            example: "completed"
          },
          payment_method: {
            type: "string",
            example: "OISY Wallet"
          },
          transaction_id: {
            type: "string",
            example: "txn_1234567890abcdef"
          },
          gateway_response: {
            type: "object",
            additionalProperties: true
          },
          notes: {
            type: "string",
            example: "Customer payment for order"
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:00:00Z"
          },
          created_by: {
            type: "string",
            example: "user"
          }
        }
      },
      
      // Inventory schemas
      InventoryItem: {
        type: "object",
        required: ["id", "name", "sku", "category", "quantity"],
        properties: {
          id: {
            type: "string",
            example: "INV-001"
          },
          name: {
            type: "string",
            example: "Carolina Reaper Plant - Large"
          },
          sku: {
            type: "string",
            pattern: "^[A-Z0-9-]{3,20}$",
            example: "CR-PLANT-LG"
          },
          category: {
            type: "string",
            enum: ["plants", "plumeria", "pepperPods", "spiceBlends", "sauces"],
            example: "plants"
          },
          description: {
            type: "string",
            example: "Premium Carolina Reaper plant in large container"
          },
          quantity: {
            type: "integer",
            minimum: 0,
            example: 15
          },
          reserved: {
            type: "integer",
            minimum: 0,
            example: 3
          },
          available: {
            type: "integer",
            minimum: 0,
            example: 12
          },
          price: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 45.00
          },
          cost: {
            type: "number",
            format: "float",
            minimum: 0,
            example: 20.00
          },
          status: {
            type: "string",
            enum: ["in_stock", "low_stock", "out_of_stock", "discontinued"],
            example: "in_stock"
          },
          low_stock_threshold: {
            type: "integer",
            minimum: 0,
            example: 5
          },
          supplier: {
            type: "string",
            example: "IC SPICY Nursery"
          },
          location: {
            type: "string",
            example: "Greenhouse A - Section 2"
          },
          last_updated: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:00:00Z"
          }
        }
      },
      
      // User schemas (Admin only)
      User: {
        type: "object",
        required: ["id", "username", "role", "status"],
        properties: {
          id: {
            type: "string",
            example: "user-123"
          },
          username: {
            type: "string",
            example: "john.doe"
          },
          email: {
            type: "string",
            format: "email",
            example: "john.doe@icspicy.com"
          },
          role: {
            type: "string",
            enum: ["guest", "user", "manager", "admin", "superadmin"],
            example: "manager"
          },
          status: {
            type: "string",
            enum: ["active", "inactive", "suspended", "pending"],
            example: "active"
          },
          principal: {
            type: "string",
            example: "rdmx6-jaaaa-aaaah-qcaiq-cai"
          },
          last_login: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:00:00Z"
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:00:00Z"
          }
        }
      }
    }
  },
  
  // Global security requirements
  security: [
    {
      ApiKeyAuth: []
    },
    {
      BearerAuth: []
    }
  ],
  
  // API paths and operations
  paths: {
    // Health check
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check endpoint",
        description: "Check API health and connectivity",
        security: [], // No authentication required
        responses: {
          200: {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse"
                },
                example: {
                  success: true,
                  data: {
                    status: "healthy",
                    version: "1.0.0",
                    timestamp: "2024-01-01T12:00:00Z"
                  }
                }
              }
            }
          }
        }
      }
    },
    
    // Orders endpoints
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List orders",
        description: "Retrieve a paginated list of orders with optional filtering",
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number",
            schema: {
              type: "integer",
              minimum: 1,
              default: 1
            }
          },
          {
            name: "limit",
            in: "query",
            description: "Number of items per page",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20
            }
          },
          {
            name: "status",
            in: "query",
            description: "Filter by order status",
            schema: {
              type: "string",
              enum: ["pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refunded"]
            }
          },
          {
            name: "date_from",
            in: "query",
            description: "Filter orders from this date",
            schema: {
              type: "string",
              format: "date-time"
            }
          },
          {
            name: "date_to",
            in: "query",
            description: "Filter orders until this date",
            schema: {
              type: "string",
              format: "date-time"
            }
          },
          {
            name: "user_id",
            in: "query",
            description: "Filter by user ID",
            schema: {
              type: "string"
            }
          },
          {
            name: "search",
            in: "query",
            description: "Search in order details",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          200: {
            description: "Orders retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    {
                      $ref: "#/components/schemas/SuccessResponse"
                    },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            orders: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/Order"
                              }
                            },
                            pagination: {
                              $ref: "#/components/schemas/Pagination"
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          400: {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      
      post: {
        tags: ["Orders"],
        summary: "Create new order",
        description: "Create a new order in the system",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items", "customer", "shipping", "total"],
                properties: {
                  items: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/OrderItem"
                    }
                  },
                  customer: {
                    $ref: "#/components/schemas/Customer"
                  },
                  shipping: {
                    $ref: "#/components/schemas/ShippingAddress"
                  },
                  billing: {
                    $ref: "#/components/schemas/BillingAddress"
                  },
                  total: {
                    type: "number",
                    format: "float",
                    minimum: 0
                  },
                  notes: {
                    type: "string"
                  }
                }
              },
              example: {
                items: [
                  {
                    id: "item-123",
                    variety: "Carolina Reaper",
                    size: "Large",
                    price: 45.00,
                    quantity: 2,
                    subtotal: 90.00,
                    category: "plants"
                  }
                ],
                customer: {
                  principal: "rdmx6-jaaaa-aaaah-qcaiq-cai",
                  email: "customer@example.com"
                },
                shipping: {
                  firstName: "John",
                  lastName: "Doe",
                  email: "john.doe@example.com",
                  address: "123 Main Street",
                  city: "Anytown",
                  state: "CA",
                  zipCode: "12345",
                  country: "United States"
                },
                total: 90.00
              }
            }
          }
        },
        responses: {
          201: {
            description: "Order created successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    {
                      $ref: "#/components/schemas/SuccessResponse"
                    },
                    {
                      type: "object",
                      properties: {
                        data: {
                          $ref: "#/components/schemas/Order"
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          400: {
            description: "Invalid order data",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    
    "/orders/{orderId}": {
      get: {
        tags: ["Orders"],
        summary: "Get order details",
        description: "Retrieve detailed information about a specific order",
        parameters: [
          {
            name: "orderId",
            in: "path",
            required: true,
            description: "Order ID",
            schema: {
              type: "string",
              pattern: "^ORD-[A-Z0-9]{8,}$"
            }
          }
        ],
        responses: {
          200: {
            description: "Order details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    {
                      $ref: "#/components/schemas/SuccessResponse"
                    },
                    {
                      type: "object",
                      properties: {
                        data: {
                          $ref: "#/components/schemas/Order"
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          404: {
            description: "Order not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    }
  },
  
  // Tags for grouping endpoints
  tags: [
    {
      name: "System",
      description: "System health and status endpoints"
    },
    {
      name: "Authentication",
      description: "User authentication and authorization"
    },
    {
      name: "Orders",
      description: "Order management operations"
    },
    {
      name: "Transactions",
      description: "Financial transaction handling"
    },
    {
      name: "Inventory",
      description: "Inventory management operations"
    },
    {
      name: "Users",
      description: "User management (Admin only)"
    },
    {
      name: "Analytics",
      description: "Business analytics and reporting"
    }
  ]
};

/**
 * Generate example requests and responses for testing
 */
export const API_EXAMPLES = {
  // Order creation example
  createOrder: {
    request: {
      items: [
        {
          id: "item-cr-lg-001",
          variety: "Carolina Reaper",
          size: "Large",
          price: 45.00,
          quantity: 1,
          subtotal: 45.00,
          category: "plants"
        },
        {
          id: "item-ds-md-002", 
          variety: "Death Spiral",
          size: "Medium",
          price: 25.00,
          quantity: 2,
          subtotal: 50.00,
          category: "plants"
        }
      ],
      customer: {
        principal: "rdmx6-jaaaa-aaaah-qcaiq-cai",
        email: "spicylover@example.com"
      },
      shipping: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: "+1-555-987-6543",
        address: "456 Pepper Lane",
        city: "Hotville",
        state: "TX",
        zipCode: "54321",
        country: "United States"
      },
      billing: {
        sameAsShipping: true
      },
      total: 95.00,
      notes: "Please handle with care - these are superhot peppers!"
    },
    response: {
      success: true,
      data: {
        id: "ORD-SP2024001234",
        status: "pending",
        created_at: "2024-01-15T14:30:00Z",
        source: "ic-spicy-frontend"
      }
    }
  },
  
  // Transaction creation example
  createTransaction: {
    request: {
      order_id: "ORD-SP2024001234",
      amount: 95.00,
      currency: "USD",
      type: "payment",
      payment_method: "OISY Wallet",
      transaction_id: "oisy_txn_abc123def456"
    },
    response: {
      success: true,
      data: {
        id: "TXN-SP2024005678",
        status: "completed",
        created_at: "2024-01-15T14:31:00Z"
      }
    }
  },
  
  // Inventory update example
  updateInventory: {
    request: {
      quantity: 12,
      reason: "order_fulfillment"
    },
    response: {
      success: true,
      data: {
        id: "INV-CR-LG-001",
        quantity: 12,
        available: 9,
        reserved: 3,
        updated_at: "2024-01-15T14:32:00Z"
      }
    }
  }
};

export default LOGISTICS_API_SPEC;

