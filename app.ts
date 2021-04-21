import Homey from 'homey';
import fetch from 'node-fetch';

const trigger_departure = "skanetransport_trigger_next_departure";
const action_next_departure = "skanetransport_find_next_departure";
const action_check_departure = "skanetransport_check_departure";

class PubtransportSkane extends Homey.App {
	_departureTrigger!: Homey.FlowCardTrigger;
	_departureActionNextDeparture!: Homey.FlowCardAction;
	_departureActionCheckDeparture!: Homey.FlowCardAction;
	async onInit(): Promise<void> {
		this.log('Public transport is running...')
		
		// Register FlowCardTrigger
		this._departureTrigger = this.homey.flow.getTriggerCard(trigger_departure);
		this._departureTrigger.registerRunListener(async (args: any, state: any) => {

			this.log('Trigger args: ', args);
			this.log('Trigger state: ', state);

			// If true, this flow should run
			return true;
		});

		// Register FlowCardAction
		this._departureActionNextDeparture = this.homey.flow.getActionCard(action_next_departure);
		this._departureActionCheckDeparture = this.homey.flow.getActionCard(action_check_departure);

		this._departureActionNextDeparture
		.registerRunListener(async (args: { stationFrom: { name: string; id: any; }; stationTo: { name: string; id: any; }; }) => {
			// Find route and get next departure
			this.log(`Find route and get next departure: ${args.stationFrom.name} | ${args.stationFrom.id} - ${args.stationTo.name} | ${args.stationTo.id}`);			

			return await this.getNextDeparture(args.stationFrom, args.stationTo, new Date().toTimeString().substr(0,5));
		})

		this._departureActionCheckDeparture
		.registerRunListener(async (args: { stationFrom: { name: string; id: any; }; stationTo: { name: string; id: any; }; departureTime: string; }) => {
			// Find route and get next departure
			this.log(`Find route and get next departure: ${args.stationFrom.name} | ${args.stationFrom.id} - ${args.stationTo.name} | ${args.stationTo.id}`);			
			
			if(!/\d\d:\d\d/g.test(args.departureTime)) // If not a valid time set time to current time
				args.departureTime = new Date().toTimeString().substr(0,5);

			return await this.getNextDeparture(args.stationFrom, args.stationTo, args.departureTime);
		})

		// Get arguments from "Station from" on action card
		this._departureActionNextDeparture
		.getArgument('stationFrom')
		.registerAutocompleteListener(( query: string, args: any ) => {
				this.log(query)

				if(query.length >= 3) {
					return this.stationAutoComplete(query);
				}
			})

		// Get arguments from "Station to" on action card
		this._departureActionNextDeparture
		.getArgument('stationTo')
		.registerAutocompleteListener(( query: string, args: any ) => {
				this.log(query)

				if(query.length >= 3) {
					return this.stationAutoComplete(query);
				}
			})

		// Get arguments from "Station from" on action card
		this._departureActionCheckDeparture
		.getArgument('stationFrom')
		.registerAutocompleteListener(( query: string, args: any ) => {
				this.log(query)

				if(query.length >= 3) {
					return this.stationAutoComplete(query);
				}
			})

		// Get arguments from "Station to" on action card
		this._departureActionCheckDeparture
		.getArgument('stationTo')
		.registerAutocompleteListener(( query: string, args: any ) => {
				this.log(query)

				if(query.length >= 3) {
					return this.stationAutoComplete(query);
				}
			})

	}

	stationAutoComplete(query: string) {
		return new Promise((resolve, reject) => {
			let apiUrl = 'https://api.resrobot.se/location.name.json?key=54bf99d9-c02e-472c-8dd3-40c6fe37fb21&input=' + encodeURIComponent(query);
			fetch(apiUrl)
				.then(res => res.json())
				.then(response => {
				
				this.log(response.StopLocation);
				
				if(response.StopLocation.length > 0) {
					const searchResult = response.StopLocation
										.map((busStop: any) => {
											return {
												name: busStop.name,
												id: busStop.id
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

	async getNextDeparture(from: { name: string; id: any; }, to: { name: string; id: any; }, time: string) {
		
			// Create api-url
			let apiUrl = 'https://api.resrobot.se/v2/trip?key=54bf99d9-c02e-472c-8dd3-40c6fe37fb21&originId='+from.id+'&destId='+to.id+'&format=json';
			this.log(apiUrl);

			let route = {
				name: '',
				time: null
			}

			await fetch(apiUrl)
				.then(res => res.json())
				.then(response => {
				

					response.Trip.forEach((trip: any) => {
						let leg = trip.LegList.Leg[0];
						if(leg.type !== 'WALK') {
							// Build return object
							route.name = leg.name;
							route.time = leg.Origin.time;
							return;
						}
					});
		});

		let tokens = {
			route_name: route.name,
			next_departure: route.time,
			delayed: 0
		}

		this.log("Tokens", tokens);
		// Trigger flowcard with tokens
		await this._departureTrigger.trigger(tokens, tokens)
		.then(this.log)
		.catch(this.error)
	}
}

module.exports = PubtransportSkane;