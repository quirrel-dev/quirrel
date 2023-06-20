# Docker

To deploy Quirrel using Docker, first set up a Redis instance with persistence turned on. Then follow these steps:

1. Pull the official Quirrel Docker image:

```bash
docker pull ghcr.io/quirrel-dev/quirrel:main
```

2. Define your environment variables in a `.env` file:

```env
REDIS_URL=your_redis_url
PASSPHRASES=your_passphrases
REDIS_TLS_CA_BASE64=your_base64_encoded_certificate # if applicable
REDIS_TLS_CA_FILE=your_certificate_file_path # if applicable
```

3. Run the Docker container, replace `<name_of_your_container>` with your preferred container name:

```bash
docker run --env-file .env -p 9181:9181 ghcr.io/quirrel-dev/quirrel:main
```

This will start a new Quirrel container and expose it on port 9181.
