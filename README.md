# n8n-nodes-nebula

A collection of custom n8n nodes for integrating with **Nebula** - enabling Human-in-the-Loop (HITL) workflows, action execution, and webhook-based triggers.

## Nodes

| Node | Description |
|------|-------------|
| [Nebula HITL Request](nodes/NebulaHitlRequest/README.md) | Create human approval/input requests that pause workflow execution until a human responds |
| [Nebula Action](nodes/NebulaAction/README.md) | Execute Nebula Actions via the Nebula API |
| [Nebula Trigger](nodes/NebulaTrigger/README.md) | Webhook-based trigger that starts workflows with Survey.js form data |

## Credentials

| Credential | Description |
|------------|-------------|
| [Nebula API](credentials/README.md#nebula-api) | Authentication for outbound requests to Nebula |
| [Nebula Trigger Auth](credentials/README.md#nebula-trigger-auth) | Authentication for incoming webhook requests |

See the [credentials documentation](credentials/README.md) for setup instructions.

## Installation

### Prerequisites

- n8n version 1.0.0 or later
- Node.js 18.10 or later
- pnpm (recommended) or npm

### Install via npm (Community Nodes)

In your n8n instance, go to **Settings → Community Nodes** and install:

```
n8n-nodes-nebula
```

### Manual Installation (Self-hosted n8n)

1. **Clone or download this repository:**

```bash
cd ~/.n8n/custom
git clone https://github.com/linkorb/n8n-nodes-nebula.git
cd n8n-nodes-nebula
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Build the node:**

```bash
pnpm build
```

4. **Restart n8n:**

```bash
# If running n8n directly
n8n start

# If running via PM2
pm2 restart n8n

# If running via Docker
docker restart n8n
```

### Installation with Docker

If you're running n8n in Docker, you can mount the custom nodes:

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    volumes:
      - ~/.n8n:/home/node/.n8n
      - ./n8n-nodes-nebula:/home/node/.n8n/custom/n8n-nodes-nebula
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
```

## Quick Start

### 1. Set Up Credentials

1. In n8n, go to **Credentials → Add Credential**
2. Search for "Nebula API" and configure your Nebula instance connection
3. See [credentials documentation](credentials/README.md) for details

### 2. Use a Node

- **For human approvals**: Use the [Nebula HITL Request](nodes/NebulaHitlRequest/README.md) node
- **For executing actions**: Use the [Nebula Action](nodes/NebulaAction/README.md) node
- **For triggering workflows**: Use the [Nebula Trigger](nodes/NebulaTrigger/README.md) node

## Development

### Project Structure

```
n8n-nodes-nebula/
├── credentials/
│   ├── NebulaApi.credentials.ts      # Outbound API authentication
│   ├── NebulaTriggerAuth.credentials.ts  # Inbound webhook authentication
│   └── README.md                     # Credentials documentation
├── nodes/
│   ├── NebulaAction/                 # Execute Nebula actions
│   ├── NebulaHitlRequest/            # Human-in-the-loop requests
│   ├── NebulaTrigger/                # Webhook trigger with forms
│   └── README.md                     # Nodes overview
├── package.json
├── tsconfig.json
└── README.md
```

### Building from Source

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode (for development)
pnpm dev

# Lint
pnpm lint

# Format
pnpm format
```

## Troubleshooting

### Node not appearing in n8n

1. Ensure the build completed successfully (`pnpm build`)
2. Check that the `dist` folder contains compiled JS files
3. Verify the custom nodes path in n8n configuration
4. Restart n8n completely

### Authentication errors

1. Verify credentials in n8n are correct
2. Check your backend's authentication logic
3. Look at the backend logs for more details

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [n8n](https://n8n.io) - Fair-code workflow automation
- [n8n documentation on creating nodes](https://docs.n8n.io/integrations/creating-nodes/)
- [Survey.js](https://surveyjs.io) - Form library used for form definitions

## Support

- Create an issue on GitHub for bug reports
- Discussions for questions and feature requests
