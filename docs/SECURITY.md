# Security Considerations

## Bash Tool Security Warning

### Risk Level: HIGH

The bash tool (`src/agent/tools/definitions/bash.ts`) allows the AI agent to execute arbitrary shell commands on the host system. This presents significant security risks:

### Potential Threats

1. **Arbitrary Code Execution**: The AI could execute any command with the permissions of the user running Tobi
2. **Data Exfiltration**: Sensitive data could be accessed and transmitted
3. **System Modification**: Files and system configurations could be altered or deleted
4. **Privilege Escalation**: If run with elevated privileges, could compromise entire system
5. **Network Attacks**: Could initiate network connections or attacks from your system

### Current Protections

- Command timeout (default 30 seconds)
- Execution in current working directory only
- Uses `/bin/bash` shell explicitly

### Recommended Mitigations

For production or sensitive environments, implement:

1. **Command Whitelisting**: Only allow specific approved commands
2. **Sandboxing**: Run Tobi in a containerized environment (Docker, Podman)
3. **User Restrictions**: Create a dedicated low-privilege user for Tobi
4. **Command Review**: Always review bash commands before execution
5. **Filesystem Isolation**: Use chroot or similar to limit file access
6. **Network Isolation**: Block or monitor network access
7. **Audit Logging**: Log all bash commands for security review

### Safe Usage Guidelines

1. Never run Tobi with root or administrator privileges
2. Use in isolated development environments only
3. Review all tool execution requests before approval
4. Keep sensitive data outside Tobi's working directory
5. Regularly audit the command history
6. Consider disabling the bash tool if not needed

### Disabling the Bash Tool

To disable bash command execution, remove or comment out the bash tool registration in:
`src/agent/tools/definitions/index.ts`

## API Key Security

### Best Practices

1. Store API keys in environment variables, never in code
2. Use `.env` file and add it to `.gitignore`
3. Rotate API keys regularly
4. Use API key restrictions (IP allowlists, usage quotas)
5. Monitor API usage for anomalies

### Configuration File Security

The config file at `~/.config/tobi/config.json5` may contain sensitive information:

- Keep appropriate file permissions (600 or 400)
- Do not share configuration files
- Review configuration before committing to version control

## LLM Provider Risks

Be aware that:

1. All prompts and tool outputs are sent to the configured LLM provider
2. Sensitive data in your project may be transmitted to third-party APIs
3. Consider data privacy regulations (GDPR, CCPA, etc.)
4. Use local models (Ollama) for sensitive projects

## General Security Practices

1. Keep dependencies updated
2. Review code changes before committing
3. Use version control to track all changes
4. Regular security audits of the codebase
5. Follow principle of least privilege
