// Import the Chromium browser into our scraper.
const { chromium } = require('playwright');



// Open a Chromium browser. We use headless: false
// to be able to watch the browser window.


// Logger implementation
class Logger {
    constructor() {
        this.logLevel = 'info';
        this.logToConsole = true;
        this.logToFile = false;
        this.logFilePath = 'google-arts-scraper.log';
    }

    setLogLevel(level) {
        this.logLevel = level;
    }

    setLogToConsole(logToConsole) {
        this.logToConsole = logToConsole;
    }

    setLogToFile(logToFile, logFilePath) {
        this.logToFile = logToFile;
        if (logFilePath) {
            this.logFilePath = logFilePath;
        }
    }

    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        if (data !== undefined) {
            if (typeof data === 'object') {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }

        return formattedMessage;
    }

    log(level, message, data) {
        const levels = ['debug', 'info', 'warn', 'error'];
        if (levels.indexOf(level) < levels.indexOf(this.logLevel)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, data);

        if (this.logToConsole) {
            switch (level) {
                case 'debug':
                    console.debug(formattedMessage);
                    break;
                case 'info':
                    console.info(formattedMessage);
                    break;
                case 'warn':
                    console.warn(formattedMessage);
                    break;
                case 'error':
                    console.error(formattedMessage);
                    break;
            }
        }

        if (this.logToFile) {
            // In a real implementation, you would write to a file here
            // For now, we'll just log to console
            console.log(`[FILE] ${formattedMessage}`);
        }
    }

    debug(message, data) {
        this.log('debug', message, data);
    }

    info(message, data) {
        this.log('info', message, data);
    }

    warn(message, data) {
        this.log('warn', message, data);
    }

    error(message, data) {
        this.log('error', message, data);
    }
}

// Get logger instance
const logger = new Logger();

const BASE_URL = "https://artsandculture.google.com";

async function extractArtData(page) {
    try {
        // Wait for the page to load completely
        await page.waitForLoadState('networkidle');

        // Get the page content
        const htmlContent = await page.content();
        logger.debug("Page content retrieved", { contentLength: htmlContent.length });

        // Get all elements with class os1Bab
        const artElements = await page.$$('.os1Bab');
        logger.info(`Found ${artElements.length} art elements`);

        // Extract data from each element
        const artItems = await Promise.all(artElements.map(async (element) => {
            try {
                // Get the link element which contains most of the information
                const linkElement = await element.$('a.e0WtYb');
                if (!linkElement) {
                    logger.warn('Link element not found');
                    return null;
                }

                // Extract title from h3
                const title = await element.$eval('h3.U1INFb', el => el.textContent?.trim() || '');
                
                // Extract artist from span with class Z8Qc2
                const artist = await element.$eval('.Z8Qc2', el => el.textContent?.trim() || '');
                
                // Extract image URL from data-bgsrc attribute
                const imageUrl = await linkElement.getAttribute('data-bgsrc');
                
                // Extract link from href attribute
                const link = await linkElement.getAttribute('href');

                logger.info('Extracted art item', {
                    title,
                    artist,
                    imageUrl,
                    link,
                });

                return {
                    id: link,
                    title,
                    artist,
                    description: '', // Description might not be available
                    imageUrl: imageUrl ? `https:${imageUrl}` : '',
                    sourceUrl: link ? `${BASE_URL}${link}` : '',
                };
            } catch (error) {
                logger.error('Error extracting data from element', error);
                return null;
            }
        }));

        // Filter out any null items and log the results
        const validArtItems = artItems.filter((item) => item !== null);
        logger.info(`Successfully extracted ${validArtItems.length} art items`);

        return {
            items: validArtItems,
            hasMore: true, // We'll determine this based on scrolling
            totalItems: validArtItems.length
        };
    } catch (error) {
        logger.error("Error extracting art data", error);
        return { items: [], hasMore: false, totalItems: 0 };
    }
}

async function runGoogleArtsScraper(query = 'art', maxImages = 50) {
    logger.info("Starting Google Arts data retrieval", { query, maxImages });

    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });

        const page = await context.newPage();

        // Construct the URL with query parameters
        let url = `https://artsandculture.google.com/search/asset?q=${encodeURIComponent(query)}`;

        logger.info("Navigating to URL", { url });
        await page.goto(url, { waitUntil: 'networkidle' });

        // Navigate to the URL and wait for content
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');

        // Start infinite scroll
        logger.info("Starting infinite scroll...");
        let result = {items: [], hasMore: true, totalItems: 0};
        const scrollPage = async () => {
            let previousHeight = 0;
            logger.info(`Starting scroll with height: ${previousHeight}`);

            while (true) {
                const currentHeight = await page.evaluate(() => document.body.scrollHeight);
                logger.info(`Current height: ${currentHeight}`);

                if (currentHeight === previousHeight) {
                    break; // Stop when no more new content is added
                }

                previousHeight = currentHeight;

                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });

                logger.info("Scrolled, waiting for more content...");
                await page.waitForTimeout(6000); // Adjust if needed
                result = await extractArtData(page);
                console.log(result,maxImages,result.items.length,"result=====>");
                if (result.items.length >= maxImages) {
                    break;
                }
            }
        }

        
      
        await scrollPage();
        logger.info("Infinite scroll complete, extracting data...");


        if (result.items.length === 0) {
            logger.warn("No results found");
            return { success: false, message: "No results found", items: [] };
        }

        logger.info("Data retrieval completed successfully", {
            itemCount: result.items.length,
            hasMore: result.hasMore
        });

        return { 
            success: true, 
            message: "Data retrieval completed successfully", 
            items: result.items 
        };
    } catch (error) {
        logger.error("Error in getGoogleArtsData", error);
        return { success: false, message: "Error in getGoogleArtsData", items: [] };
    } finally {
        await browser.close();
        logger.info("Browser closed");
    }
}

module.exports = {
    runGoogleArtsScraper
}; 