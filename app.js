'use strict';

const Homey = require('homey');

const axios = require('axios');
const convert = require('xml-js');

const trigger_departure = "skanetransport_trigger_next_departure";
const action_departure = "skanetransport_find_next_departure";

class Skanetrafiken extends Homey.App {
	
	onInit() {
		this.log('Skanetrafiken is running...')
		
		// Register FlowCardTrigger
		let departureTrigger = new Homey.FlowCardTrigger(trigger_departure).register();

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
			// let tokens = {};    
			let date = new Date(new Date().setMinutes( new Date().getMinutes() - 10 ));
			date = date.toISOString().substr(0, 16).replace('T', '%20');
			console.log("getNextDeparture");
			axios.get('http://www.labs.skanetrafiken.se/v2.2/resultspage.asp?cmdaction=next&selPointFr='+from.name+'|'+from.id+'|0&selPointTo='+to.name+'|'+to.id+'|0&LastStart=' + date)
				.then(response => {
					let xml = response.data;
					var json = JSON.parse(convert.xml2json(xml, {
						compact: true,
						spaces: 4
					}));
			
					let searchResult = json["soap:Envelope"]["soap:Body"].GetJourneyResponse.GetJourneyResult.Journeys.Journey;
			
					let route = searchResult[0].RouteLinks.RouteLink[0];
			
					let diffTime = (route.RealTime.RealTimeInfo !== undefined && route.RealTime.RealTimeInfo.DepTimeDeviation._text !== '') ? route.RealTime.RealTimeInfo.DepTimeDeviation._text : 0;

					let time = new Date(new Date(route.DepDateTime._text).getTime() + (-(new Date().getTimezoneOffset()) + parseInt(diffTime)) * 60000);
			
					let tokens = {
						route_name: route.Line.Name._text,
						next_departure: time.toLocaleTimeString().substring(0,5),
						delayed: (diffTime > 0)
					}

					console.log("Tokens", tokens);
					console.log("departureTrigger", departureTrigger);
					// Trigger flowcard
					departureTrigger.trigger( tokens )
					.catch( this.error )

					resolve(true);
				})
				.catch(error => {
					reject(false);
				});
		});
	}
}

module.exports = Skanetrafiken;