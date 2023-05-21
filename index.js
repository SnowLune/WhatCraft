import fetch from "node-fetch";
import inquirer from "inquirer";
import prettier from "prettier";
import cliProgress from "cli-progress";
import { parse } from "json2csv";
import { writeFile } from "node:fs";

const xivAPI_base = "https://xivapi.com";
const universalisAPI_base = "https://universalis.app/api/v2";
const universalisAPI_salesHistory = "/history/{worldDcRegion}/{itemIds}";

async function getWorlds ()
{
   const res = await fetch( `${ universalisAPI_base }/worlds` );
   if ( res.ok )
   {
      const worlds = await res.json();
      return worlds.sort( ( a, b ) => a.name.localeCompare( b.name ) );
   }
   else
      throw new Error( "Could not get worlds from Universalis API." );
}

async function getClassJobs ()
{
   const res = await fetch( xivAPI_base + "/ClassJob" );
   if ( res.ok )
   {
      const craftingJobStart = 8;
      const craftingJobEnd = 15;
      let data = await res.json();
      let jobList = data.Results.slice( craftingJobStart - 1, craftingJobEnd );

      return jobList;
   }
   else
      throw new Error( "Could not get ClassJob from XIVAPI." );
}

async function getSalesHistory ( world, items )
{
   let url = universalisAPI_base + universalisAPI_salesHistory.replace( "{worldDcRegion}", world ).replace( "{itemIds}", items.join( "," ) );
   let res = await fetch( url );
   let sales = await res.json();
   return sales;
};

async function getCraftableItems ( classJob, jobLevel )
{
   // Generate the column info for recipe ingredients
   function generateIngredientColString ()
   {
      const amountString = "AmountIngredient";
      const ingredientIDString = "ItemIngredient0TargetID";
      const ingredientNameString = "ItemIngredient0.Name";

      let ingredientColumns = [];

      for ( let i = 0; i < 10; i++ )
      {
         ingredientColumns.push( amountString + i );
         ingredientColumns.push( ingredientIDString.replace( "0", i ) );
         ingredientColumns.push( ingredientNameString.replace( "0", i ) );
      }
      return ingredientColumns;
   }

   const searchPrefix = "/search?indexes=Recipe";
   const filterPrefix = "&filters=";
   const columnsPrefix = "&columns=";

   const filters = [
      `ClassJob.ID=${ classJob }`,
      `RecipeLevelTable.ClassJobLevel<=${ jobLevel }`,
      "ItemResult.IsUntradable=0"
   ];
   const columns = [
      "ItemResultTargetID",
      "Name",
      "ClassJob.ID",
      "RecipeLevelTable.ClassJobLevel",
      "ClassJob.NameEnglish",
      "ClassJob.Abbreviation",
      "ItemResult.IsUntradable",
      ...generateIngredientColString()
   ];

   const searchURL =
      `${ xivAPI_base }${ searchPrefix }${ filterPrefix }`
      + `${ filters.join( "," ) }${ columnsPrefix }${ columns.join( "," ) }`;

   console.log( "Fetching craftable items..." );

   const progBar = new cliProgress.SingleBar( {}, cliProgress.Presets.shades_classic );
   progBar.start( 1, 0 );

   const res = await fetch( searchURL );
   const data = await res.json();
   let dataPages = [ data ];
   let pageTotal = data.Pagination.PageTotal;

   progBar.update( 1 );
   if ( pageTotal > 1 )
   {
      progBar.start( pageTotal, 1 );
      // Next page to get is 2
      for ( let i = 2; i <= pageTotal; i++ )
      {
         const res = await fetch( searchURL + `&page=${ i }` );
         const data = await res.json();
         dataPages.push( data );
         progBar.update( i );
      }
   }
   progBar.stop();
   return dataPages;
}

// Clean and restructure raw items data into a more easily usable format
function raw2Clean ( rawItemsData )
{
   class craftableItem
   {
      constructor ( rawItem )
      {
         this.name = rawItem.Name;
         this.recipeLevel = rawItem.RecipeLevelTable.ClassJobLevel;
         this.id = rawItem.ItemResultTargetID;
         this.job = rawItem.ClassJob.Abbreviation;
         this.ingredients = [];
         for ( let i = 0; i < 10; i++ )
         {
            let itemName = eval( `rawItem.ItemIngredient${ i }.Name` );
            let itemQuantity = eval( "rawItem.AmountIngredient" + i );
            let itemID = eval( `rawItem.ItemIngredient${ i }TargetID[0]` );

            if ( itemQuantity > 0 )
            {
               this.ingredients.push( {
                  name: itemName,
                  quantity: itemQuantity,
                  id: itemID,
                  slot: i
               } );
            }
         }
      }
   }

   const craftableItems = [];
   rawItemsData.forEach( page =>
   {
      page.Results.forEach( item =>
      {
         craftableItems.push( new craftableItem( item ) );
      } );
   } );

   // Sort items in level order
   craftableItems.sort( ( a, b ) => a.recipeLevel - b.recipeLevel );
   return craftableItems;
}

const worlds = await getWorlds();
const craftingJobs = await getClassJobs();
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
      let items = await getCraftableItems( answers.job, answers.level );
      let itemSales = await getSalesHistory( answers.world, [ 4 ] );
      let csvSalesData = parse( itemSales.entries );

      items = raw2Clean( items );
      let itemsFormatted = prettier.format(
         JSON.stringify( items ),
         {
            parser: "json",
            singleQuote: false
         }
      );

      const fileName = `${ items[ 0 ].job }_LV${ answers.level }.json`;
      console.log( "Saving json..." );
      writeFile( fileName, itemsFormatted, ( err ) =>
      {
         if ( err ) throw err;
         console.log( `File saved to ${ fileName }.` );
      } );
   } )
   .catch( ( error ) =>
   {
      console.error( 'Error:', error );
   } );
