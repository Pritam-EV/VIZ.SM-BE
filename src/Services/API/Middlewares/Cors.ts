import cors from "cors";

const corsHandler = cors(
    {
        // Allowed origins
        origin: [
            process.env.CLIENT_URL
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE"
        ],
        credentials: true, // Allow cookies and authentication headers to be sent with cross-origin requests
        allowedHeaders: [
            "Authorization"
        ]
    }
);

export default corsHandler;