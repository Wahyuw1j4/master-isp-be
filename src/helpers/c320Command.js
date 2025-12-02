import { addRunCommandJob } from "../bull/queues/runCommand.js";


const createOnuService = async (subscription, ssh, delay = 0) => {
    const unsuedOnuNumbers = '20'
    const vlan_profile = 'VLAN220';
    const vlan = '220';
    const realSpeed = '100';
    const gemportProfile = 'DW100M';
    const sn = "ZTEGCE729406"
    const commands2 = [
        'conf t',
        `interface gpon-olt_1/2/12`,
        `onu ${unsuedOnuNumbers} type ZTE sn ${sn}`,
        '!',
        `interface gpon-onu_1/2/12:${unsuedOnuNumbers}`,
        `name ${subscription.id} - ${subscription.customer.name.toUpperCase()}`,
        `description Vlan 220 ${subscription.customer.name.toUpperCase()}`,
        `tcont 1 name ${vlan_profile} profile ${realSpeed}M`,
        `gemport 1 name ${vlan_profile} tcont 1`,
        `gemport 1 traffic-limit upstream ${gemportProfile} downstream ${gemportProfile}`,
        `service-port 1 vport 1 user-vlan ${vlan} vlan ${vlan}`,
        '!',
        `pon-onu-mng gpon-onu_1/2/12:${unsuedOnuNumbers}`,
        `service 1 gemport 1 vlan ${vlan}`,
        `wan-ip 1 mode pppoe username ${subscription.id} password  123123 vlan-profile ${vlan_profile} host 1`,
        'security-mgmt 1 state enable mode forward protocol web',
    ]

    await addRunCommandJob(commands2, ssh.host, ssh.username, ssh.password, 'aes128-cbc', true, delay);
}

const deleteOnuService = async (subscription, ssh, delay = 0) => {
    const onuNumber = '20' 
    const commands = [
        'conf t',
        `interface gpon-olt_1/2/12`,
        `no onu ${onuNumber}`,
    ];
    await addRunCommandJob(commands, ssh.host, ssh.username, ssh.password, 'aes128-cbc', true, delay);
}

export { createOnuService, deleteOnuService };