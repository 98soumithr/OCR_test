FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy Python requirements and install
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy package files and install Node dependencies
COPY package.json package.json
COPY shared/package.json shared/package.json
COPY extension/package.json extension/package.json
RUN npm install

# Copy source code
COPY . .

# Build shared types
RUN cd shared && npm run build

# Expose ports
EXPOSE 8000 3000

# Default command
CMD ["npm", "run", "dev"]