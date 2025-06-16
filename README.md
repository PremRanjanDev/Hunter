# Hunter

Hunter is an automated job application tool built with Node.js and Puppeteer. It helps automate the process of searching and applying for jobs based on customizable criteria.

## Features

- Automated job search and application using Puppeteer.
- Customizable job search criteria and exclusion lists.
- Message templates for recruiter outreach.
- Screenshot capture for application steps.
- Easy configuration via JSON files.

## Prerequisites

- Node.js (v16 or higher recommended)
- Google Chrome installed on your system

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/PremRanjanDev/Hunter.git
   cd Hunter
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

## How to Run

To run `apply.js` using the Chrome debugger in VS Code:

1. Open the project in VS Code.
2. Go to the Run & Debug panel (or press `Cmd+Shift+D`).
3. Click on `Run and Debug` or select the `Debug` option.
4. If prompted, select `Node.js` as the environment.
5. Make sure the entry point is set to `src/apply.js`.
6. Start debugging. You can set breakpoints and step through the code interactively.

This allows you to debug the automation process directly within VS Code.

## How to Use

1. Configure your job search criteria in the `config.json` file.
2. (Optional) Customize the message templates in the `messages` directory.
3. Run the application:
   ```sh
   npm start
   ```
4. Follow the prompts in the terminal to start the job application process.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature/YourFeature`).
6. Open a pull request.

Please ensure your code follows the existing style and includes appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

