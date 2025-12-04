import { prisma, prismaQuery } from '../../prisma.js';
import { runCommands } from '../../helpers/shellCommand.js';

async function getUncfgC320() {
    const getOltC320Gpon = await prismaQuery((db) =>
            prisma.olt.findMany({
                where: { brand: 'olt-zte-c320', type: 'gpon' },
            })
        );

        for (const olt of getOltC320Gpon) {
            let commands = ['show gpon onu uncfg'];
            const commandOutput = await runCommands(commands, olt.ip_address, olt.username, olt.password, 'aes128-cbc', false);
            // console.log('Command output:', commandOutput);
            if (commandOutput.includes('No related information to show.')) {
                console.log('not founding:');
                const findAllUnconfig = await prismaQuery(() =>
                    prisma.uncfg_c320.findMany({ where: { olt_id: olt.id } })
                );
                if (findAllUnconfig.length > 0) {
                    await prismaQuery(() =>
                        prisma.uncfg_c320.deleteMany({ where: { olt_id: olt.id } })
                    );
                }
                continue;
            }
            const dataRow = commandOutput.split('\n').map(row => row.trim()).slice(4, -1);
            const dataRowSpaces = dataRow.map(row => row.split(/\s+/));
            const getAllUnconfig = await prismaQuery(() =>
                prisma.uncfg_c320.findMany({ where: { olt_id: olt.id } })
            );
            const findHasBeenConfig = getAllUnconfig.filter(data => !dataRowSpaces.some(unconfig => unconfig[0] === data.onu_index));

            if (findHasBeenConfig.length > 0) {
                findHasBeenConfig.forEach(async (unconfig) => {
                    await prismaQuery(() =>
                        prisma.uncfg_c320.deleteMany({ where: { onu_index: unconfig.onu_index } })
                    );
                })
            }
            for (const row of dataRowSpaces) {
                const unconfigData = {
                    onu_index: row[0],
                    serial_number: row[1],
                    olt_id: olt.id,
                };

                await prismaQuery(() =>
                    prisma.uncfg_c320.upsert({
                        where: {
                            onu_index_olt_id: {
                                onu_index: row[0],
                                olt_id: olt.id,
                            },
                        },
                        update: unconfigData,
                        create: unconfigData,
                    })
                );
            }
        }
        return true;
}

export { getUncfgC320 };