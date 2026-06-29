# ==========================================
# Stage 1: Build the full-stack application
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the source code
COPY . .

# Build both client and server (Vite + esbuild)
RUN npm run build

# ==========================================
# Stage 2: Optimized production runner
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Copy manifests to install production-only dependencies
COPY package*.json ./

# Install ONLY production dependencies to keep the image lightweight
RUN npm ci --only=production

# Copy compiled assets (both built UI and compiled CJS server bundle) from the builder stage
COPY --from=builder /app/dist ./dist

# The application is designed to dynamically read process.env.PORT || 3000
EXPOSE 3000

# Start the Node.js production server
CMD ["npm", "start"]
