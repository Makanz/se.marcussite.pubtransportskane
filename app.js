'use strict';

const Homey = require('homey');
const message = "Notismeddelande";
const cronName = "busUpdateSkane"
const cronInterval = "0 */5 * * * *";

class Skanetrafiken extends Homey.App {
	
	onInit() {
		this.log('Skanetrafiken is running...')

		//Homey.manager('flow').on(CONDITIONS_find_next_departure,this.getDepartures.bind(this));
		//Homey.manager('flow').on(CONDITIONS_find_next_departure+"."+ARGS_STATIONNAME+".autocomplete",this.onFindStation.bind(this))

		new Homey.FlowCardCondition('skanetrafiken_find_next_departure')
			.register()
			.registerRunListener(( args, state ) => {

				this.log(`skanetrafiken_find_next_departure ${args} ${state}`)
				return Promise.resolve( true ); // return true or false

			})
			.getArgument('station')
			.registerAutocompleteListener(( query, args ) => {
				this.log(query)
				let returnData = [];
				if(query.length >= 3) {
					returnData = [
						{
							icon: 'https://path.to/icon.svg', // or use "image: 'https://path.to/icon.png'" for non-svg icons.
							name: 'Item name',
							description: 'Optional description',
							some_value_for_myself: 'that i will recognize when fired, such as an ID'
						}
					];
				}
				return Promise.resolve(returnData);
			})

		// Register crontask
		Homey.ManagerCron.getTask(cronName)
			.then(task => {
				this.log("The task exists: " + cronName);
				task.on('run', () => this.updateData());
			})
			.catch(err => {
				if (err.code == 404) {
					this.log("The task has not been registered yet, registering task: " + cronName);
					Homey.ManagerCron.registerTask(cronName, cronInterval,null)
						.then(task => {
							task.on('run', () => this.updateData());
						})
						.catch(err => {
							this.log(`problem with registering cronjob: ${err.message}`);
						});
				} else {
					this.log(`other cron error: ${err.message}`);
				}
			});

		// Run on unload
		Homey
			.on('unload', () => {
				Homey.ManagerCron.unregisterTask(cronName);
			});
	}

	getDepartures() {
		this.log("getDepartures");
	}

	onFindStation() {
		this.log("onFindStation");
	}

	// Update data from API
	updateData() {
		this.log("Update data!")
	}

}

module.exports = Skanetrafiken;