import fetch from "node-fetch";
import inquirer from "inquirer";
import prettier from "prettier";
import { parse } from "json2csv";
import { writeFile } from "node:fs";
import craftableItem from "./src/craftableItem.js";
import { getCraftableItemsMarketData } from "./src/marketData.js";
import { universalis, xivapi } from "./src/apiService.js";
import { raw2Clean } from "./utils/helpers.js";

const datacenters = await universalis.getWorldsDCs( "data-centers" );
const worlds = await universalis.getWorldsDCs( "worlds" );
const craftingJobs = await xivapi.getClassJobs();
var job = "crafting";

const questions = [
   {
      type: 'list',
      name: 'job',
      message: 'Select a job:',
      choices:
         await craftingJobs.map(
            job => ( { name: job.Name, value: job.ID } )
         )
   },
   {
      type: 'number',
      name: 'level',
      message: `Enter ${ job } level (max: 90):`,
      validate: ( input ) =>
      {
         if ( Number.isInteger( input ) && input >= 1 && input <= 90 )
         {
            return true;
         }
         return 'Please enter a whole number between 1 and 90.';
      }
   },
   {
      type: 'list',
      name: 'world',
      message: 'Select a world server:',
      choices:
         await worlds.map(
            ( world ) => ( { name: world.name, value: world.id } )
         )
   }
];

inquirer.prompt( questions )
   .then( async ( answers ) =>
   {
      console.log( 'Selected Job:', answers.job );
      console.log( 'Selected Level:', answers.level );
      console.log( 'Selected World:', answers.world );
      let items = await xivapi.getCraftableItems( answers.job, answers.level );
      // let itemSales = await getSalesHistory( answers.world, [ 4 ] );
      // let csvSalesData = parse( itemSales.entries );

      items = raw2Clean( items );
      items = await getCraftableItemsMarketData( items, answers.world );
      let itemsFormatted = prettier.format(
         JSON.stringify( items ),
         {
            parser: "json",
            singleQuote: false
         }
      );

      const fileName = [
         `${ items[ 0 ].job }_`,
         `LV${ answers.level }_`,
         `${ answers.world }`
      ].join( "" );
      const timestamp = Math.floor( Date.now() / 1000 );
      const fileNameFull = `${ fileName }_${ timestamp }.json`;

      console.log( "Saving json..." );
      writeFile( fileNameFull, itemsFormatted, ( err ) =>
      {
         if ( err ) throw err;
         console.log( `File saved to ${ fileNameFull }.` );
      } );
   } )
   .catch( ( error ) =>
   {
      console.error( 'Error:', error );
   } );
