import craftableItem from "./craftableItem.js";
import { getCraftableItemsMarketData } from "./marketData.js";
import { universalis, xivapi } from "./apiService.js";
import { raw2Clean, downloadFile } from "./helpers.js";
import { userData, saveData } from "./user.js";

const minLevel = 1;
const maxLevel = 90;
const dataCenters = await universalis.getWorldsDCs( "data-centers" );
const worlds = await universalis.getWorldsDCs( "worlds" );
const craftingJobs = await xivapi.getClassJobs();
console.debug( { jobs: craftingJobs, dcs: dataCenters, worlds: worlds } );

// Elements
const inputFormEl = document.getElementById( "input-form" );
const jobSelectEl = document.getElementById( "class-job" );
const levelInputEl = document.getElementById( "class-job-level" );
const worldSelectEl = document.getElementById( "world-select" );
const dataCenterSelectEl = document.getElementById( "dc-select" );
const resultsEl = document.getElementById( "results" );
const loadTextEl = document.getElementById( "load-text" );
const progressBarEl = document.getElementById( "load-progress" );
const downloadBtnEl = document.getElementById( "download-btn" );

// Functions
function collectFormData ()
{
   const data = new userData(
      jobSelectEl.value,
      levelInputEl.value,
      dataCenterSelectEl.value,
      worldSelectEl.value,
      craftingJobs,
      dataCenters,
      worlds
   );

   return data;
}

function loadJobOptions ()
{
   craftingJobs.forEach( job =>
   {
      const option = document.createElement( "option" );
      option.text = job.Name[ 0 ].toUpperCase().concat( job.Name.slice( 1 ) );
      option.value = job.ID;
      jobSelectEl.appendChild( option );
   } );
}

function setLevelRange ()
{
   levelInputEl.setAttribute( "min", minLevel );
   levelInputEl.setAttribute( "max", maxLevel );
   levelInputEl.value = minLevel;
}

function loadDataCenterOptions ()
{
   dataCenters.forEach( ( dataCenter, index ) =>
   {
      const option = document.createElement( "option" );
      option.text = dataCenter.name;
      option.value = index;
      dataCenterSelectEl.appendChild( option );
   } );
}

dataCenterSelectEl.addEventListener( "change", () =>
{
   worldSelectEl.innerHTML = "";
   const worldIDs = dataCenters[ dataCenterSelectEl.value ].worlds;
   worldIDs.forEach( worldID =>
   {
      const option = document.createElement( "option" );
      option.text = worlds.find( world => world.id === worldID )?.name;
      option.value = worldID;
      worldSelectEl.appendChild( option );
   } );
   worldSelectEl.removeAttribute( "disabled" );
} );

function init ()
{
   setLevelRange();
   loadJobOptions();
   loadDataCenterOptions();
}

inputFormEl.addEventListener( "submit", async ( event ) =>
{
   event.preventDefault();
   downloadBtnEl.disabled = true;
   const userData = collectFormData();

   const rawItemsData = await xivapi.getCraftableItems(
      userData.classJobID, userData.classJobLevel
   );

   const itemsData = raw2Clean( rawItemsData );
   const itemsMarketData = await getCraftableItemsMarketData(
      itemsData, userData.worldID
   );

   console.log( "Done." );

   saveData( userData, itemsMarketData );
   downloadBtnEl.disabled = false;
   downloadBtnEl.addEventListener( "click", ( e ) =>
   {
      e.preventDefault();

      if ( e.target.disabled )
         return;

      downloadFile(
         itemsMarketData,
         [
            "WhatCraft_",
            `${ userData.classJobName }_`,
            `LV${ userData.classJobLevel }_`,
            `${ userData.worldName }_`,
            `${ Math.floor( Date.now() / 1000 ) }`,
            ".json"
         ].join( "" ),
         "application/json"
      );
   } );
} );

if ( document.readyState === "loading" )
{
   document.addEventListener( "DOMContentLoaded", ( event ) =>
   {
      init();
   } );
}
else
   init();
