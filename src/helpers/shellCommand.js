import SSH2Shell from 'ssh2shell';

const runCommands = (commands, host, username, password, cipher = null, debug = false) => {
    // insert command in 0 index 
    // commands.unshift('terminal length 0');
    try {
        const SSH = new SSH2Shell({
            server: {
                host: host,
                port: 22,
                username: username,
                password: password,
                algorithms: {
                    cipher: cipher ? [cipher] : undefined,
                }
            },
            commands: commands,
            connectedMessage: `Connected to host1`,
            dataIdleTime: 100,
            idleTime: 50000,
            onCommandProcessing: function (command, response, sshObj, stream) {
                // Reset confirmSent flag for each new command
                if (sshObj.lastCommand !== command) {
                    sshObj.confirmSent = false;
                    sshObj.lastCommand = command;
                }
                if (response.includes("[yes/no]")) {
                    if (!sshObj.confirmSent) {
                        console.log("Detected confirmation prompt, sending 'yes'...");
                        stream.write("yes\n");
                        sshObj.confirmSent = true;
                    } else {
                        console.log("Already confirmed for this command, ignoring...");
                    }
                }
            }
        });

        return new Promise((resolve, reject) => {
            let output = '';
            SSH.on('commandComplete', (cmd, response) => {
                if (debug) {
                    console.log(response);
                }
                output += response; // Gabungkan output setiap command
            });

            SSH.on('end', () => resolve(output));
            SSH.on('error', reject);

            SSH.connect();
        });
    } catch (error) {
        throw error;
    }
};

export { runCommands };