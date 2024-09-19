# Toptal Scraper

A web scraper built using [node.js](https://nodejs.org/) and [puppeteer](https://pptr.dev/) to scrap the data (developer's resume information) from [Toptal](https://www.toptal.com/), which is an exclusive network of the top freelance software developers, designers, finance experts, product managers, and project managers in the world.

## Features

- Scrape developer profiles from Toptal
- Save scraped data into [MongoDB](https://www.mongodb.com/)

## Scrape Data

The scraper gets the following data from each developer profile:

- id
- name
- title
- location
- country
- summary
- skills
- top_skills
- portfolio
- availability
- preferred_env
- amazing
- work_exp
- proj_exp
- education
- certification
- category_skills

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine. Here's a [guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) on how you can install them.
- MongoDB instance running either locally or cloud-based (like [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Installing

1. Clone this repository

   ```
   git clone https://github.com/dreamjet31/toptal_scraper.git
   ```

2. Install the dependencies

   ```
   cd toptal_scraper
   npm install
   ```

3. Create a .env file and add your MongoDB connection string:

   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/test?retryWrites=true&w=majority
   ```

   Replace `<username>` and `<password>` with the actual username and password of your MongoDB.

4. Run the scraper
   
   ```
   node index.js
   ```

5. Wait for the script to finish. All data is saved in the MongoDB collection 'resume'.

**NOTE:** Please ensure that you have a stable internet connection while running the script to successfully scrape the data.

## Dependencies

- [dotenv](https://www.npmjs.com/package/dotenv): Loads environment variables from a `.env` file into `process.env`
- [memory-cache](https://www.npmjs.com/package/memory-cache): In-memory cache that is simple to use
- [mongodb](https://www.npmjs.com/package/mongodb) Node.js driver for MongoDB
- [puppeteer](https://www.npmjs.com/package/puppeteer): Provides a high-level API to control Chrome or Chromium over the DevTools Protocol

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the ISC License.
