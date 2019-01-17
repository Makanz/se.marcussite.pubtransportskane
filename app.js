'use strict';

const Homey = require('homey');

const axios = require('axios');
const convert = require('xml-js');

const trigger_departure = "skanetransport_trigger_next_departure";
const action_departure = "skanetransport_find_next_departure";
let departureTrigger = "";

class PubtransportSkane extends Homey.App {
	
	onInit() {
		this.log('Public transport Skåne is running...')
		
		// Register FlowCardTrigger
		departureTrigger = new Homey.FlowCardTrigger(trigger_departure).register();

		// Register FlowCardAction
		let departureAction = new Homey.FlowCardAction(action_departure);

		departureAction
		.register()
		.registerRunListener((args) => {
			// Find route and get next departure
			this.log(`Find route and get next departure: ${args.stationFrom.name} | ${args.stationFrom.id} - ${args.stationTo.name} | ${args.stationTo.id}`);

			return this.getNextDeparture(args.stationFrom, args.stationTo);
		})

		// Get arguments from "Station from" on action card
		departureAction
		.getArgument('stationFrom')
		.registerAutocompleteListener(( query, args ) => {
				this.log(query)

				if(query.length >= 3) {
					return this.stationAutoComplete(query);
				}
			})

		// Get arguments from "Station to" on action card
		departureAction
		.getArgument('stationTo')
		.registerAutocompleteListener(( query, args ) => {
				this.log(query)

				if(query.length >= 3) {
					return this.stationAutoComplete(query);
				}
			})

	}

	stationAutoComplete(query) {
		return new Promise((resolve, reject) => {
			axios.get('http://www.labs.skanetrafiken.se/v2.2/querystation.asp?inpPointfr=' + encodeURIComponent(query))
			.then(response => {
			let xml = response.data;
			var json = JSON.parse(convert.xml2json(xml, {
				compact: true,
				spaces: 4
			}));
			
			let searchResult = json["soap:Envelope"]["soap:Body"].GetStartEndPointResponse.GetStartEndPointResult.StartPoints.Point;
		
			if(searchResult.length > 0) {
				searchResult = searchResult
									.map((busStop) => {
										return {
											name: busStop.Name._text,
											id: busStop.Id._text
										}
									});
				resolve(searchResult);
			} else {
				resolve([{name: "Nothing found!"}]);
			}
			
			})
			.catch(error => {
				reject(error);
			});	
		});
	}

	getNextDeparture(from, to) {
		return new Promise((resolve, reject) => { 
			let date = new Date(new Date().setMinutes( new Date().getMinutes() - 5 )); // Minus 5 minutes
			date = new Date(date.getTime() + (-(new Date().getTimezoneOffset())) * 60000); // Fix timezone
			date = date.toISOString().substr(0, 16).replace('T', '%20');
			//console.log("getNextDeparture");
	
			// Create api-url
			let apiUrl = 'http://www.labs.skanetrafiken.se/v2.2/resultspage.asp?cmdaction=next&selPointFr='+from.name+'|'+from.id+'|0&selPointTo='+to.name+'|'+to.id+'|0&LastStart=' + date;
			console.log(apiUrl);
			axios.get(apiUrl)
				.then(response => {
					let xml = response.data;
					let json = JSON.parse(convert.xml2json(xml, {
						compact: true,
						spaces: 4
					}));
					
					// Extract journey
					let searchResult = json["soap:Envelope"]["soap:Body"].GetJourneyResponse.GetJourneyResult.Journeys.Journey;
					
					// Check if there is multiple routes
					let route = "";
					if(searchResult[0].RouteLinks.RouteLink.length > 1) {
						route = searchResult[0].RouteLinks.RouteLink[0]
					} else {
						route = searchResult[0].RouteLinks.RouteLink
					}
	
					// Check if there are is a realtime object
					let diffTime = "0";
					if(route.RealTime !== undefined && Object.keys(route.RealTime).length !== 0) {
						diffTime =  (route.RealTime.RealTimeInfo.DepTimeDeviation._text !== '') ? route.RealTime.RealTimeInfo.DepTimeDeviation._text : "0";
					}
	
					// Add diff time to departure
					let time = new Date(route.DepDateTime._text).getTime();
					time = new Date(new Date(time).setMinutes(new Date(time).getMinutes() + parseInt(diffTime)));
					
					// Build return object
					let tokens = {
						route_name: route.Line.Name._text,
						next_departure: time.toLocaleTimeString().substring(0,5),
						delayed: (diffTime > 0)
					}
	
					console.log("Tokens", tokens);
					// Trigger flowcard with tokens
					departureTrigger.trigger( tokens )
					.then(d => console.log("departureTrigger", d))
					.catch( this.error )
	
					resolve(true);
				})
				.catch(error => {
					reject(error);
				});
		});
	}
}

module.exports = PubtransportSkane;