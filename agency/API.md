
### API Documentation

The backend provides a RESTful API for handling enquiries.

**Base URL**: `http://localhost:5000/api`

#### Endpoints

1.  **POST /enquiries**
    -   Description: Create a new enquiry (contact form submission).
    -   Rate Limit: 100 requests per 15 minutes per IP.
    -   Request Body:
        ```json
        {
          "name": "John Doe",
          "email": "john@example.com",
          "service": "App Development",
          "message": "I need..."
        }
        ```
    -   Response:
        -   `201 Created`: Enquiry saved successfully.
        -   `400 Bad Request`: Validation error.
        -   `429 Too Many Requests`: Rate limit exceeded.

### Security Features

-   **Helmet**: Sets secure HTTP headers.
-   **Rate Limiting**: Protects against brute-force and DDoS attacks.
-   **CORS**: Configured to allow cross-origin requests (customize origin in production).
