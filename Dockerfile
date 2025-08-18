FROM node:18

# Install necessary libraries for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libgtk-3-0 \
    libx11-6 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libpango1.0-0 \
    libgdk-pixbuf2.0-dev \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
