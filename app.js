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

		let tokens = {
			'next_departure': '21:50',
			'route_name': '222',
			'delayed': true
		}

		// Register FlowCardAction
		let departureAction = new Homey.FlowCardAction(action_departure);

		departureAction
		.register()
		.registerRunListener((args) => {
			// Find route and get next departure
			this.log(`Find route and get next departure: ${args.stationFrom.name} | ${args.stationFrom.id} - ${args.stationTo.name} | ${args.stationTo.id}`);

			// Trigger flowcard
			departureTrigger.trigger( tokens )
			.catch( this.error )

			return Promise.resolve(true);
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

	getDepartures() {
		this.log("getDepartures");
	}

	onFindStation() {
		this.log("onFindStation");
	}

}

module.exports = Skanetrafiken;