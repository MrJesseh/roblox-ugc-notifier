const getAllRecentUGC = require('./Roblox/getAllRecentUGC');
const config = require('./config.json');
const getProductInfo = require('./Roblox/getProductInfo');
const webhook = require('./Discord/WebhookHandler');
const db = require('./Database/Items');
const notableIds = require('./config.json').notableIds;
const keywords = require('./config.json').limitedKeyWords;



class Scanner {
    constructor(){}

    async initRequests(){
        console.log("\x1b[32m", "[✅] Initialized Scanner!", '\x1b[0m');
        const self = this;
        setInterval(this.scanner, config.scannerInterval, self);
    }

    async scanner(self){
        let items = await getAllRecentUGC();
        self.processItems(items.data);
    }

    async processItems(items){
        if(items == false || items == undefined){return console.log("Scanner hit rate limit.");}
        for(var i = 0; i < items.length; i++){
            if(await db.getScannedItem(items[i].id) != false){
            }else{
                // Add the item to the database.
                await db.addScannedItem(
                    {
                    assetId: items[i].id,
                    dateScanned: new Date()
                    }
                );

                // Get the product info for the item.
                let productInfo = await getProductInfo(items[i].id);
                let name = productInfo.Name;
                let desc = productInfo.Description;
                let id = items[i].id;
                let price = productInfo.PriceInRobux;
                let forSale = productInfo.IsForSale;
                let created = productInfo.Created;
                let creator = productInfo.Creator.Name;


                // Emit event for webhook.
                await webhook.sendNewItemAlert(name, desc, id, price, forSale, created, creator);
                
                // Check to see if it is a notable item.
                if(notableIds.includes(productInfo.Creator.CreatorTargetId.toString())){
                    await webhook.sendNotableItemAlert(name, desc, id, price, forSale, created, creator);
                    await db.addNotableItem(id, name, desc, creator, created);
                }

                // Check to see if it is possibly a limited
                let lcName = name.toLowerCase();
                let lcDesc = desc.toLowerCase();
                let regex = /\d+\s*\/\s*\d+/;
                for(let j = 0; j < keywords.length; j++){
                    if(lcDesc.includes(keywords[j]) || lcName.includes(keywords[j]) || regex.test(desc) || regex.test(name)){
                        await webhook.sendPossibleLimitedAlert(name, desc, id, price, forSale, created, creator);
                        break;
                    }
                }
            }
        }
    }
}

const ScannerInstance = new Scanner();
Object.freeze(ScannerInstance);

module.exports = ScannerInstance;