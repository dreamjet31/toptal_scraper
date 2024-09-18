const puppeteer = require("puppeteer");
const urlLib = require("url");
const MongoClient = require("mongodb").MongoClient;
const fs = require("fs");
const cache = require("memory-cache");

require("dotenv").config();

const developers_url = require("./list").developers_url


console.log(developers_url);

const MONGODB_URI = process.env.MONGODB_URI;

async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {

    const client = await MongoClient.connect(MONGODB_URI);
    console.log("MongoDB connected")
    const db = client.db("toptal");
    const collection = db.collection("resume");
    collection.createIndex({ "id": 1 });

    const browser = await puppeteer.launch({
        headless: false,
        args: ["--start-maximized"],
        timeout: 6000000,
        protocolTimeout: 6000000,
        defaultViewport: null,
    });

    // Open a new page
    let page = await browser.newPage();

    for (let page_url of developers_url) {
        await page.goto(page_url, { timeout: 120000 });
        console.log("category: ", page_url);

        // Get all the url links  
        const resum_urls = await page.evaluate(() =>
            Array.from(document.querySelectorAll('[data-testid="talent-name"] > a'), a => a.href)
        );

        // await page.waitForSelector('[data-testid="talent-name"] a');
        // await delay(2000);
        // const resum_urls = await page.$$eval('h3[data-testid="talent-name"] > a', links => links.map(a => a.href));

        console.log(resum_urls);

        // const urls = ["https://www.toptal.com/resume/brian-neeland?s=full-stack", "https://www.toptal.com/resume/kashif-mehmood?s=mean"];

        for (let url of resum_urls) {


            const urlObj = urlLib.parse(url, true);

            let pathName = urlObj.pathname;
            let paths = pathName.split('/');

            let id = paths[paths.length - 1];

            let existingRecord = cache.get(id);

            if (existingRecord) {
                console.log(`Record with ID ${id} already exists from cache`)
            } else {
                existingRecord = await collection.findOne({ id: id });
                cache.put(id, existingRecord);
                if (existingRecord) {
                    console.log(`Record with ID ${id} already exists...`)
                } else {
                    await page.goto(url, { timeout: 120000 });
                    await page.waitForSelector("h1");
                    const name = await (await page.$('h1')).evaluate(h1 => h1.innerText);
                    const [titleElement, locationElement, memberDateElement] = await page.$$('[data-testid="talent-intro-location"]');
                    const title = await titleElement.evaluate(el => el.innerText);

                    let locationString = await locationElement.evaluate(el => el.innerText);
                    let locationArray = locationString.split(','); // split the string by commas  

                    let country = locationArray[locationArray.length - 1].trim(); // the last part is the country  

                    const member_date = await memberDateElement.evaluate(el => el.innerText);

                    const skillsSection = await page.$('[data-testid="experience-skills-section"]');
                    const skills = skillsSection ? await skillsSection.$$('a[data-testid="skill-tag"]') : null;

                    const top_skillList = skills ? await Promise.all(skills.map(async (skill) => {
                        const skillText = await skill.evaluate(el => el.innerText);
                        const [skillTitle, skillYears] = skillText.split(" - ");
                        return {
                            skill_title: skillTitle,
                            skill_years: parseInt(skillYears.match(/\d+/)[0], 10)
                        }
                    })) : {};

                    const summary = await page.$eval('[data-testid="talent-intro-description"]', summary => summary.innerText);

                    // Portfolio
                    const portfolioSection = await page.$('[data-testid="portfolio-highlights-section"]');
                    const projects = portfolioSection ? await portfolioSection.$$('div.mb-4') : null;

                    const projectList = projects ? await Promise.all(projects.map(async (project) => {
                        const projectName = await project.$eval('a', a => a.innerText);
                        const projectSkills = await project.$eval('div.text-base', div => div.innerText);
                        return {
                            project_name: projectName,
                            project_skills: projectSkills.replace("...", "").split(',')
                        };
                    })) : {};

                    // Skillset
                    const skillElements = await page.$$('a[data-testid="skill-tag"]');
                    const skillsList = await Promise.all(skillElements.map(skill => skill.evaluate(el => el.innerText)));

                    // Availability
                    const availability = await page.$eval('[data-testid="availability-section"] div.text-sm', el => el.innerText);
                    const preferred_env = await page.$eval('[data-testid="preferred-environment-section"] p.text-sm', el => el.innerText);
                    const amazing = await page.$eval('[data-testid="amazing-section"] p.text-sm', el => el.innerText);

                    // Employment history
                    const workExperienceSection = await page.$('[data-testid="work-experience-section"]');
                    const jobs = await workExperienceSection.$$('div.relative');

                    const work_exp = await Promise.all(jobs.map(async job => {
                        const role = await job.$eval('h4', el => el.innerText);
                        const company = await job.$eval('h5', el => el.innerText);
                        const period = await job.$eval('h4 ~ div', el => el.innerText);
                        const [start_date, end_date] = period.split(" - ")
                        const achievements = await job.$$eval('[data-testid^="description-employment"] ul > li', els => els.map(li => li.innerText));

                        return {
                            role,
                            company,
                            start_date,
                            end_date,
                            achievements
                        };
                    }));

                    // Experience
                    const experienceSection = await page.$('[data-testid="experience-section"]');
                    const experiences = experienceSection ? await experienceSection.$$('div.mb-6') : null;


                    const proj_exp = experiences ? await Promise.all(experiences.map(async (experience) => {
                        const projectTitle = await experience.$eval('h4', h4 => h4.innerText);

                        let url;
                        try {
                            url = await experience.$eval('a', a => a.href);
                        } catch {
                            url = '';
                        }

                        const description = await experience.$$eval('._2XsmF_ig', divs =>
                            divs.map(div => div.innerText.replace(/\n/g, ''))
                        );

                        return {
                            project_title: projectTitle,
                            url: url,
                            description: description.join(' ')
                        };
                    })) : {};

                    // Education
                    const educationSection = await page.$('[data-testid="education-section"]');
                    const educations = educationSection ? await educationSection.$$('div[data-testid="education-list-item"]') : null;

                    const education = educations ? await Promise.all(educations.map(async (education) => {
                        const period = await education.$eval('div.text-gray-700', div => div.innerText);
                        const degree = await education.$eval('h4', h4 => h4.innerText);

                        const universityText = await education.$eval('p', p => p.innerText);
                        const [university_name, university_location] = universityText.split(" - ");

                        return {
                            degree: degree,
                            university_name: university_name,
                            university_location: university_location,
                            period: period
                        };
                    })) : {};

                    // Certification
                    const certificationSection = await page.$('[data-testid="certifications-section"]');
                    const certifications = certificationSection ? await certificationSection.$$('div[data-testid="education-list-item"]') : null;

                    const certification = certifications ? await Promise.all(certifications.map(async (certification) => {
                        const period = await certification.$eval('div.text-gray-700', div => div?.innerText || "");
                        const certificationTitle = await certification.$eval('h4', h4 => h4?.innerText || "");
                        const certificationProvider = await certification.$eval('p', p => p?.innerText || "");

                        return {
                            certification_title: certificationTitle,
                            certification_provider: certificationProvider,
                            period: period
                        };
                    })) : {};

                    // category skills
                    const skillCategorySection = await page.$('[data-testid="skill-categories-section"]');
                    const skillCategories = skillCategorySection ? await skillCategorySection.$$('div.mb-6') : null;

                    const category_skills = skillCategories ? await Promise.all(skillCategories.map(async (category) => {
                        const category_name = await category.$eval('h4', h4 => h4.innerText);
                        const skills = await category.$eval('p', p => p.innerText);

                        return {
                            category_name: category_name,
                            skills: skills.split(',')
                        };
                    })) : {};

                    const profile = {
                        "id": id,
                        "name": name,
                        "title": title,
                        "location": locationString,
                        "country": country,
                        "summary": summary,
                        "skills": skillsList.slice(0, skillsList.length - top_skillList.length),
                        "top_skills": top_skillList,
                        "portfolio": projectList,
                        "availability": availability,
                        "preferred_env": preferred_env,
                        "amazing": amazing,
                        "work_exp": work_exp,
                        "proj_exp": proj_exp,
                        "education": education,
                        "certification": certification,
                        "category_skills": category_skills
                    }



                    console.log(`Successfullly inserted ${id}`)
                    await collection.insertOne(profile);

                    cache.put(id, profile)
                }

            }

        }

    }


    await browser.close();
    await client.close();


})();