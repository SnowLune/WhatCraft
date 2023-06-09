import { updateProgress } from "./helpers.js";

export const universalis = {

   baseURL: "https://universalis.app/api/v2",

   // Fetcher function used by getCurrentData and getSalesHistory
   async fetchMarketData ( itemIDs, url, options )
   {
      const { progressBar, progressText } = options;

      // Object to store accumulated request data
      let itemsData = { itemIDs: [], items: {} };

      // Break itemIDs into 100 length chunks to minimize api requests
      const maxIDs = 100;

      const itemTotal = itemIDs.length;

      for ( let i = 0; i < itemTotal; i += maxIDs )
      {
         // Progress bar
         updateProgress( progressText, progressBar, i, itemTotal,
            `Fetching item market data...(${ i }/${ itemTotal })` );

         let itemIDsChunk = itemIDs.slice( i, i + maxIDs );
         let chunkURL = url.replace( "{itemIDs}", itemIDsChunk.join( "," ) );
         const res = await fetch( chunkURL );
         const data = await res.json();
         // Merge items
         Object.assign( itemsData.items, await data.items );
      }
      // Done progress
      updateProgress( progressText, progressBar, itemTotal, itemTotal,
         `Fetching item market data...(${ itemTotal }/${ itemTotal })` );
      return itemsData;
   },

   // Get the current average minimum price of an item
   // using the average lowest prices
   async getCurrentData ( itemIDs, worldID, options )
   {
      const defaultOpts = { listings: 10, entries: 10 };
      const mergedOpts = { ...defaultOpts, ...options };
      const { listings, entries, progressBar, progressText } = mergedOpts;

      const itemsPref = itemIDs.length > 1 ? "items." : "";
      const fields = [
         `${ itemsPref }listings.pricePerUnit`,
         `${ itemsPref }recentHistory.pricePerUnit`,
         `${ itemsPref }regularSaleVelocity`,
         `${ itemsPref }currentAveragePrice`,
         `${ itemsPref }itemID`,
         `${ itemsPref }worldID`,
         `${ itemsPref }lastUploadTime`
      ];

      const currentDataURL = [
         `${ this.baseURL }`,
         `/${ worldID }`,
         "/{itemIDs}",
         listings > 0 ? `?listings=${ listings }` : "",
         entries > 0 ? `&entries=${ entries }` : "",
         `&fields=${ fields.join( "," ) }`
      ].join( "" );

      const currentData = await this.fetchMarketData( itemIDs, currentDataURL, { progressBar: progressBar, progressText: progressText } );
      return currentData;
   },

   async getSalesHistory ( itemIDs, worldID, entriesWithin, options )
   {
      const defaultOpts = { entries: 0 };
      const mergedOpts = { ...defaultOpts, ...options };
      const { entries, progressBar, progressText } = mergedOpts;

      const salesHistoryURL = [
         `${ this.baseURL }`,
         `/history`,
         `/${ worldID }`,
         "/{itemIDs}",
         entries > 0 ? `?entriesToReturn=${ entries }` : "",
         entriesWithin > 0 ? `&entriesWithin=${ entriesWithin }` : ""
      ].join( "" );

      const salesHistoryData =
         await this.fetchMarketData( itemIDs, salesHistoryURL,
            { progressBar: progressBar, progressText: progressText } );
      return salesHistoryData;
   },

   // Get data about worlds, data centers, and regions
   async getWorldsDCs ( locationType )
   {
      locationType = locationType.toLowerCase();
      const locationTypes = [ "worlds", "data-centers" ];

      if ( locationTypes.includes( locationType ) )
      {
         try
         {
            const res = await fetch( `${ this.baseURL }/${ locationType }` );
            if ( res.ok )
            {
               const worlds = await res.json();
               return worlds.sort( ( a, b ) => a.name.localeCompare( b.name ) );
            }
            else
               throw new
                  Error( `Could not get ${ locationType } from Universalis API.` );
         } catch ( error )
         {
            console.error( error );
         }
      }
      else
         throw new Error(
            "Unexpected input. Expected \"worlds\" or \"data-centers\"."
         );
   },
};

export const xivapi = {
   baseURL: "https://xivapi.com",

   async getClassJobs ()
   {
      const res = await fetch( this.baseURL + "/ClassJob" );
      if ( res.ok )
      {
         const craftingJobStart = 8;
         const craftingJobEnd = 15;
         const data = await res.json();
         let jobList = data.Results.slice( craftingJobStart - 1, craftingJobEnd );

         return jobList;
      }
      else
         throw new Error( "Could not get ClassJob from XIVAPI." );
   },

   async getCraftableItems ( classJob, jobLevel, options )
   {
      const { progressBar, progressText } = options;

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
         "SecretRecipeBook",
         ...generateIngredientColString()
      ];

      const searchURL = [
         `${ this.baseURL }`,
         `${ "/search?indexes=Recipe" }`,
         `${ "&filters=" }`,
         `${ filters.join( "," ) }`,
         `${ "&columns=" }`,
         `${ columns.join( "," ) }` ].join( "" );

      updateProgress( progressText, progressBar, 0, 1,
         "Fetching craftable items..." );

      const res = await fetch( searchURL );
      const data = await res.json();
      let dataPages = [ data ];
      let pageTotal = data.Pagination.PageTotal;

      if ( pageTotal > 1 )
      {
         // Next page to get is 2
         for ( let i = 2; i <= pageTotal; i++ )
         {
            updateProgress( progressText, progressBar, i, pageTotal,
               `Fetching craftable items...(${ i }/${ pageTotal })` );
            const res = await fetch( searchURL + `&page=${ i }` );
            const data = await res.json();
            dataPages.push( data );
         }
      }

      updateProgress( progressText, progressBar, pageTotal, pageTotal,
         `Done. ${ pageTotal }/${ pageTotal }` );

      return dataPages;
   }
};
