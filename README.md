# Custom-GPT-memory-management

This repository contains the code, configurations and instructions for the implementation of a memory management and storage infrastructure for custom GPTs

## Table of Contents

- [Instructions](#instructions)
- [GPT Manager setup](#gpt-manager-setup)
- [Server setup](#server-setup)
- [Custom GPTs creation/extension](#custom-gpts-creationextension)
- [Testing](#testing)

## Instructions:

### GPT Manager setup:

- Create a GPT Manager private custom GPT as specified in the first entry of `docs/gpts.json`
- Upload `docs/GPT_manager_instructions` file to the Knowledge section of the GPT Manager
- Create the new action of the GPT Manager and paste the contents of the `gpt_manager_actions_configuration.json` to its configuration (replace the server URL - `https://api.perpetuumit.com` with your desired enpoint domain that you will create on your server in the upcoming steps)

### Server setup

- Clone this repository to the desired directory on your server:

```bash
git clone https://github.com/tibor-zukina/Custom-GPT-memory-management
```

- Run the script `scripts/init.sh` to create the data directories (update the `ROOT_PROJECT_PATH` to the desired location)
- Copy `example.gpts.json` to `gpts.json` - for now, delete all the entries except the first one that refers to the GPT Manager
- Copy `example.auth.json` to `auth.json` - delete all the entries expect the one referring to the GPT Manager, and specify the HTTP auth password that you will use with your GPT manager (do not change the username)
- Execute the script:

```bash
scripts/auth_to_base64.sh "gpt_manager:<your-password>"
```

(copy the output and save it securely as the GPT Manager API key)

- Install the dependencies inside the root project directory (NodeJS required):

```bash
cd /var/openai/gpt_memory
npm install
```

- Create the `gpt-memory` service that will make your server run in the background:
  - `nano /etc/systemd/system/gpt-memory.service` (copy the content from `docs/gpt-memory.service`)
  - `systemctl daemon-reload`
  - `systemctl enable gpt-memory`
  - `systemctl start gpt-memory`

- Edit your virtual host configuration file to direct the request sent to your API endpoint to the NodeJS process on your local port (Apache and LetsEncrypt required) - replace the domain, port, and certificate paths with your values

```bash
nano perpetuumit.com.conf
```

(add the configuration section from the `example.virtualhost.conf`)

```bash
systemctl restart httpd
```

### Custom GPTs creation/extension

- In the Custom GPT interface, edit the Action of the GPT Manager and set the Basic auth type with the value of the previously stored GPT Manager API key
- Create new custom GPTs (or update the existing ones) and upload the `docs/GPT_instructions` to their Knowledge section. You can use the examples from docs/`docs/gpts.json` or add your examples to `docs/gpts.json` while deleting the entries you won't use. If you create a new GPT, you should append the text from `docs/gpts.json` to its instructions instead of completely overwriting them - this will ensure you don't lose the existing behavior of your GPTs
- Create a new action for each of the created/updated GPTs and copy the contents of `docs/gpt_actions_configuration.json` to the action configuration (replace the server URL - `https://api.perpetuumit.com` with your desired enpoint domain)
- Create a new chat with the GPT Manager; for each of the GPTs that you created or extended with the `GPT_instructions` and `gpt_actions_configuration.json`, ask the GPT Manager to add this GPT by the specifying the name, ID, description and the list of the previously created GPTs this GPT should share a memory with, ask the GPT Manager to retrieve the credentials for the newly declared custom GPT and update the API key in its action configuration with the exact value provided by the GPT Manager

### Testing

- Once you create new or extend the existing GPTs, add the instructions file to their knowledge, configure the extra action for each of them, declare them to the GPT Manager and set the API key provided by the GPT Manager in each of their action configuration, you can interact with each of them as described inside the `GPT_instruction` and `GPT_manager_instructions`. The custom GPT update will not be reflected in the existing chats with them, but you will need to create new chats to be able to use the memory layer.
- To examine the resulting actions of your interactions or resolve the potential issues, refer to `/var/log/gpt_memory/output.log` and `/var/log/gpt_memory/error.log` or run:

```bash
systemctl status gpt-memory
```
### Memory data

- The memories of each of the custom GPTs can be found in the `memory` folder of the `data` directory - e.g. `memory/custom-gpt.json`
- Files created by each of the custom GPTs can be found in their dedicated directories of the `files` folder of the `data` directory - e.g. `files/custom-gpt/`
- Backups of the memory and files are created after every change submitted to the memory or files and can viewer or recovered from the `memory_backups` and `files_backups` directories
