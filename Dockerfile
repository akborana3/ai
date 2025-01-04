# Use official Node.js image from Docker Hub
FROM node:18-slim

# Set working directory in the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port 8080 (default for Hugging Face Spaces)
EXPOSE 8080

# Run the app when the container starts
CMD ["node", "api/chat.js"]
