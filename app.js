'use strict';

const Homey = require('homey');

const https = require('https');

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
			this.log(`Find route and get next departure: ${args.stationFrom.name} - ${args.stationTo.name}`);

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

					return new Promise(function(resolve, reject) {
						https.get('https://reqres.in/api/users/2', (resp) => {
							let data = '';
							// A chunk of data has been recieved.
							resp.on('data', (chunk) => {
								data += chunk;
							});

							// The whole response has been received. Print out the result.
							resp.on('end', () => {
								console.log("End", JSON.parse(data));
								
								resolve([
									{
										image: 'https://path.to/icon.png',
										name: 'Gruvgatan, Höganäs',
										description: 'Optional description',
										some_value_for_myself: 'that i will recognize when fired, such as an ID'
									}
								]);
							});

						}).on("error", (err) => {
							console.log("Error: " + err.message);
							reject(err);
						});
					});
				}
			})

		// Get arguments from "Station to" on action card
		departureAction
		.getArgument('stationTo')
		.registerAutocompleteListener(( query, args ) => {
				this.log(query)
				let returnData = [];
				if(query.length >= 3) {
					returnData = [
						{
							image: 'https://path.to/icon.png',
							name: 'Sundstorget',
							description: 'Optional description',
							some_value_for_myself: 'that i will recognize when fired, such as an ID'
						}
					];
				}
				return Promise.resolve(returnData);
			})

	}

	getDepartures() {
		this.log("getDepartures");
	}

	onFindStation() {
		this.log("onFindStation");
	}
}

module.exports = Skanetrafiken;