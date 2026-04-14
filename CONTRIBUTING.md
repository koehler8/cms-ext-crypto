# Contributing

Thanks for your interest in contributing to this extension!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Make your changes
5. Test with a local Vertex CMS (`@koehler8/cms`) project to verify your changes render correctly

## Submitting Changes

1. Create a feature branch from `main`
2. Commit your changes with clear, descriptive messages
3. Push to your fork and open a pull request
4. Describe what you changed and why

## Guidelines

- Follow the existing Vue SFC patterns in `components/`
- Keep config keys consistent with the extension manifest (`extension.config.json`)
- Preserve analytics instrumentation when modifying presale flows
- Use environment variables for any chain-specific or project-specific values
- Ensure accessibility (semantic HTML, ARIA attributes, keyboard navigation)
- Respect `prefers-reduced-motion` for animated surfaces

## Reporting Issues

Use [GitHub Issues](https://github.com/koehler8/cms-ext-crypto/issues) to report bugs or request features.
