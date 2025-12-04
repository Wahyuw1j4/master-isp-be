import { addRunCommandJob } from "../bull/queues/runCommand.js";
import { createNotification } from "./Notification.js";


const createOnuService = async (subscription, ssh, delay = 0) => {
    const createNotif = await createNotification({
        notif_id: `c320-onu-create-${subscription.id}`,
        notif_identifier: 'c320-onu-create',
        title: 'Creating ONU Service',
        message: `Creating ONU service for subscription ${subscription.id}`,
        category: 'c320',
        link: `/subscription/${subscription.id}`
    });

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

    await addRunCommandJob(delay, { commands: commands2, host: ssh.host, username: ssh.username, password: ssh.password, cipher: 'aes128-cbc', debug: true, notif: createNotif });
}

const deleteOnuService = async (subscription, ssh, delay = 0) => {
    const createNotif = await createNotification({
        notif_id: `c320-onu-delete-${subscription.id}`,
        notif_identifier: 'c320-onu-delete',
        title: 'Deleting ONU Service',
        message: `Deleting ONU service for subscription ${subscription.id}`,
        category: 'c320',
        link: `/subscription/${subscription.id}`
    });
    const onuNumber = '20'
    const commands = [
        'conf t',
        `interface gpon-olt_1/2/12`,
        `no onu ${onuNumber}`,
    ];
    await addRunCommandJob(delay, { commands, host: ssh.host, username: ssh.username, password: ssh.password, cipher: 'aes128-cbc', debug: true, notif: createNotif });
}

const reboot = async (subscription) => {
    const creteNotif = await createNotification({
        notif_id: `reboot-onu-${subscription.id}`,
        notif_identifier: 'reboot-onu',
        title: 'Rebooting ONU',
        message: `Rebooting ONU for subscription ${subscription.id}`,
        category: 'onu',
        link: `/subscription/${subscription.id}`
    });
    const onuNumber = '20'
    const commands = [
        `conf t`,
        `pon-onu-mng gpon-onu_${subscription.onu.onu_index}`,
        'reboot',
    ]
    await addRunCommandJob(0, { commands, host: subscription.olt.ip_address, username: subscription.olt.username, password: subscription.olt.password, cipher: 'aes128-cbc', debug: true, notif: creteNotif });
}
export { createOnuService, deleteOnuService, reboot };