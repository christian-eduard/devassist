const nexus = require('./db_nexus');

async function test() {
    await nexus.initNexus();
    const agent = await nexus.getAgent('main');
    console.log("AGENT:", agent);
    process.exit(0);
}
test();
