const fs = require("fs");
var qnas = require("./resources/qnas.json");

const puppeteer = require("puppeteer");

const jobSearch = [
  {
    name: "Java full stack in Singapore",
    active: true,
    locations: ["Singapore"],
    keywords: [
      "java react",
      "java react aws",
      "java full stack developer",
      "java full stack",
      "full stack developer",
      "java developer",
      "java",
    ],
    salary: {
      current: {
        monthly: "8500",
        yearly: "102000",
      },
      expected: {
        monthly: "9000",
        yearly: "108000",
      },
    },
    excludeCompanies: ["ScienTec"],
    connectRecruiter: true,
  },
];

const tncQuesPhrases = [
  "BY CHECKING THIS BOX, YOU WILL DECLARE THAT YOU READ ",
  "Please check this box to confirm your acknowledgement of our Privacy policy ",
  "I agree to share my ",
  "indicate that you agree to ",
  "I agree to share my ",
];

const recruiterMsgTemplate = `Hi {{name}},
Hope you're doing well.
I came across an intriguing opportunity as {{job_title}} at {{company}}. I am keen to connect and discuss how my skills align with your team's objectives.
Looking forward to the conversation!

Best Regards,
Prem Ranjan`;

class Applier {
  loadDelay = 2500;
  clickDelay = 2000;
  inputDelay = 1000;
  success = 0;
  skipped = 0;
  failed = 0;
  ssDir = `./screenshots/${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-T:]/g, "-")}`;

  delay = (time) => {
    return new Promise(function (resolve) {
      setTimeout(resolve, time);
    });
  };
  dismiss = async (page) => {
    console.log("::dismiss");
    try {
      const dismissBtn = await page.$('button[aria-label="Dismiss"]');
      if (dismissBtn) {
        await dismissBtn.click();
        await this.delay(this.clickDelay);
      }
      const discardBtn = await page.$(
        'button[data-control-name="discard_application_confirm_btn"]'
      );
      if (discardBtn) {
        await discardBtn.click();
        await this.delay(this.clickDelay);
      }
    } catch (err) {
      console.log("ERROR(dismiss): " + err);
    }
  };
  takeScreenshot = async (page, id) => {
    if (!fs.existsSync(this.ssDir)) {
      fs.mkdirSync(this.ssDir, { recursive: true });
    }
    const currentMillis = new Date().getTime();
    const path = `${this.ssDir}/${currentMillis}_${id}.png`;
    await page.screenshot({
      path,
    });
    console.log("Screenshot saved as: ", path);
  };
  saveQueses = async (ukwnQnas) => {
    console.log("::saveQueses");
    let added = false;
    for (let qna of ukwnQnas) {
      if (!(qna.key in qnas)) {
        console.log("Adding QnA: " + JSON.stringify(qna));
        qnas = { ...qnas, ...qna };
        added = true;
      }
    }
    if (added) {
      let json = JSON.stringify(qnas, null, "\t");
      fs.writeFileSync("./src/resources/qnas.json", json);
      console.log("Added queses");
    }
  };
  getAns = (ques, search) => {
    console.log("::getAns");
    const quesLower = ques.toLowerCase();
    if (
      quesLower.includes("salary") ||
      quesLower.includes("salry") ||
      quesLower.includes("remuneration") ||
      quesLower.includes("compensation")
    ) {
      return this.getSal(ques, search);
    }
    return qnas[ques];
  };
  getSal = (ques, search) => {
    console.log("::getSal");
    let salaryQues = ques.toLowerCase();
    if (salaryQues.includes("expect") || salaryQues.includes("desired")) {
      if (salaryQues.includes("year") || salaryQues.includes("annual")) {
        return search.salary.expected.yearly;
      } else {
        return search.salary.expected.monthly;
      }
    }
    if (salaryQues.includes("current") || salaryQues.includes("drawn")) {
      if (salaryQues.includes("year") || salaryQues.includes("annual")) {
        return search.salary.current.yearly;
      } else {
        return search.salary.current.monthly;
      }
    }
    return qnas[ques];
  };
  hasInvalidFields = async (page) => {
    return (
      (await page.$(`div[aria-invalid="true"]`)) ||
      (await page.$(`fieldset[aria-invalid="true"]`)) ||
      (await page.$(`li-icon[type="error-pebble-icon"]`))
    );
  };
  easyApplyModel = async (page) =>
    await page.$('div[class="jobs-easy-apply-content"]');

  setFields = async (page, search) => {
    console.log("::setFields");

    return (
      (await this.enterAllTextField(page, search)) &
      (await this.selectAllRadioBtn(page)) &
      (await this.selectAllDropDown(page))
    );
  };

  selectAllRadioBtn = async (page) => {
    console.log("::selectRadioBtn");
    const radioBtns =
      (await page.$$(
        'fieldset[data-test-form-builder-radio-button-form-component="true"]'
      )) ||
      (await page.$$('fieldset[data-test-checkbox-form-component="true"]'));
    let unknownQuest = [];
    for (const radioBtn of radioBtns) {
      try {
        const ques = await radioBtn.$eval(
          'legend span[aria-hidden="true"]',
          (element) => element.textContent.trim()
        );
        const isTnCQues = tncQuesPhrases.some((phrase) =>
          ques.toLowerCase().includes(phrase.toLowerCase())
        );
        if (isTnCQues) {
          let chkBox = await radioBtn.$(`fieldset div input[type="checkbox"]`);
          await chkBox.click();
          await this.delay(this.clickDelay);
        } else {
          const ans = this.getAns(ques);
          console.log(ques, " : ", ans);
          if (ans) {
            let option = await radioBtn.$(
              `input[data-test-text-selectable-option__input="${ans}"]`
            );
            if (option) {
              await option.click();
              await this.delay(this.inputDelay);
            }
          } else {
            const options = await radioBtn.$$eval(
              `fieldset div label`,
              (options) => options.map((option) => option.innerText).join("/")
            );
            unknownQuest.push({ [ques]: options });
            await this.saveQueses([{ [ques]: options }]);
          }
        }
      } catch (error) {
        console.log("ERROR(selectRadioBtn): ", error);
      }
    }
    console.log("unknownQuest.length: ", unknownQuest.length);
    return unknownQuest.length == 0;
  };

  enterAllTextField = async (page, search) => {
    console.log("::enterTextField");
    const textSinglelineFields = await page.$$(
      "div[data-test-single-line-text-form-component]"
    );
    const textMultilineFields = await page.$$(
      "div[data-test-multiline-text-form-component]"
    );
    const textFields = textSinglelineFields.concat(textMultilineFields);
    let unknownQuest = [];
    for (const textField of textFields) {
      try {
        const ques = await textField.$eval("label", (element) =>
          element.textContent.trim()
        );
        const ans = this.getAns(ques, search);
        console.log(ques, " : ", ans);
        if (ans) {
          const txt = await textField.$("input");
          if (txt) {
            await txt.click({ clickCount: 3 });
            await this.delay(this.inputDelay);
            await txt.type(ans);
            await this.delay(this.inputDelay);
          }
        } else {
          unknownQuest.push({ [ques]: "" });
          if (unknownQuest.length) {
            await this.saveQueses([{ [ques]: "" }]);
          }
        }
      } catch (error) {
        console.log("ERROR(enterTextField): ", error);
      }
    }
    console.log("unknownQuest.length: ", unknownQuest.length);
    return unknownQuest.length == 0;
  };

  selectAllDropDown = async (page) => {
    console.log("::selectDropDown");
    const ddls = await page.$$(
      "div[data-test-text-entity-list-form-component]"
    );
    let unknownQuest = [];
    for (const ddl of ddls) {
      const select = await ddl.$("select");
      const ques = await ddl.$eval(
        'label span[aria-hidden="true"]',
        (element) => element.textContent.trim()
      );
      const ans = this.getAns(ques);
      console.log(ques, " : ", ans);
      if (ans) {
        if (Array.isArray(ans)) {
          console.log("Required string, found array");
        } else {
          await select.select(ans);
        }
      } else {
        const options = await select.$$eval(`option`, (els) =>
          els.map((el) => el.value)
        );
        unknownQuest.push({ [ques]: options });
        if (unknownQuest.length) {
          await this.saveQueses([{ [ques]: options }]);
        }
      }
    }
    console.log("unknownQuest.length: ", unknownQuest.length);
    return unknownQuest.length == 0;
  };

  doApply = async (page) => {
    console.log("::doApply");
    let easyApplyBtn = await page.$(
      'div[class="jobs-apply-button--top-card"] button'
    );

    if (!easyApplyBtn) {
      console.log("Easy Apply button not found");
      return false;
    }
    await easyApplyBtn.click();
    await this.delay(this.loadDelay);
    return true;
  };
  doNext = async (page, location, id) => {
    console.log("::doNext");
    const nextBtnSelector = 'button[aria-label="Continue to next step"]';
    const reviewBtnSelector = 'button[aria-label="Review your application"]';
    const submitBtnSelector = 'button[aria-label="Submit application"]';
    let nextBtn =
      (await page.$(nextBtnSelector)) ||
      (await page.$(reviewBtnSelector)) ||
      (await page.$(submitBtnSelector));
    await nextBtn.click();
    await this.delay(this.clickDelay);
    return true;
  };
  doReview = async (page, location, id) => {
    console.log("::doReview");
    const reviewBtnSelector = 'button[aria-label="Review your application"]';
    let reviewBtn = await page.$(reviewBtnSelector);
    await reviewBtn.click();
    await this.delay(this.clickDelay);
  };
  doSubmit = async (page) => {
    console.log("::doSubmit");
    const submitBtn = await page.$('button[aria-label="Submit application"]');
    await submitBtn.click();
    await this.delay(this.loadDelay);
  };
  connectRecruiter = async (mainPage, browser, job) => {
    console.log("::connectRecruiter");
    let profilePage = null;
    try {
      const profileCard = await mainPage.$(
        'div[class="hirer-card__container"] div div a[data-test-app-aware-link]'
      );
      let profileLink = null;
      if (profileCard) {
        profileLink = await mainPage.evaluate((e) => e.href, profileCard);
      }
      console.log("profileLink: ", profileLink);
      if (profileLink) {
        profilePage = await browser.newPage();
        await profilePage.goto(profileLink);
        await this.delay(this.loadDelay);
        console.log("profilePage: ", profilePage);
        const recruiterName = await profilePage.$eval(
          "main section div div div div h1",
          (e) => e.innerText
        );
        console.log("name: ", recruiterName);
        let connectBtns = await profilePage.$$(
          `button[aria-label="Invite ${recruiterName} to connect" `
        );
        let connectBtn = null;
        if (connectBtns) {
          connectBtn = connectBtns[connectBtns.length - 1];
        }
        if (!connectBtn) {
          const moreBtns = await profilePage.$$(
            'button[aria-label="More actions"]'
          );
          let moreBtn = null;
          if (moreBtns) {
            moreBtn = moreBtns[moreBtns.length - 1];
          }
          if (moreBtn) {
            await moreBtn.click();
            await this.delay(this.clickDelay);
          }
          let connectBtn2 = await profilePage.$(
            'div[class="pvs-profile-actions "] div div div ul li div[role="button"] li-icon[type="connect"]'
          );
          connectBtn = await profilePage.$(
            `div[aria-hidden="false"] div ul div[aria-label="Invite ${recruiterName} to connect"]`
          );
        }
        if (connectBtn) {
          await connectBtn.click();
          await this.delay(this.loadDelay);
          const inviteModel = await profilePage.$("#send-invite-modal");
          if (inviteModel) {
            if (job) {
              const addNoteBtn = await profilePage.$(
                'button[aria-label="Add a note"]'
              );
              if (addNoteBtn) {
                await addNoteBtn.click();
                await this.delay(this.loadDelay);
                const msgTxt = await profilePage.$('textarea[name="message"]');
                if (msgTxt) {
                  const firstName = recruiterName.split(" ")[0];
                  const recruiterMsg = recruiterMsgTemplate
                    .replace("{{name}}", firstName)
                    .replace("{{job_title}}", job.title)
                    .replace("{{company}}", job.company);
                  await msgTxt.type(recruiterMsg);
                  await this.delay(this.loadDelay);
                }
              }
            }
            const sendNow = await profilePage.$(
              'button[aria-label="Send now"]'
            );
            if (sendNow) {
              await sendNow.click();
              await this.delay(this.loadDelay);
              console.log("+Connection request sent successfully");
            }
            const connectConfirmBtn = await profilePage.$(
              'button[aria-label="Connect"]'
            );
            if (connectConfirmBtn) {
              await connectConfirmBtn.click();
              await this.delay(this.loadDelay);
            }
            const other = await profilePage.$('button[aria-label="Other"]');
            if (other) {
              await other.click();
              await this.delay(this.loadDelay);
            }
          }
        }
      } else {
        console.log("Profile not found");
      }
    } catch (err) {
      console.log("ERROR(connectRecruiter): " + err);
    } finally {
      if (profilePage) {
        await profilePage.close();
        await this.delay(this.clickDelay);
      }
    }
  };

  easyApply = async (page, search, browser) => {
    console.log("::easyApply");
    for (let pageCount = 1; pageCount < 10; pageCount++) {
      console.log("#Page No.: " + pageCount);
      const pageNo = await page.$(`button[aria-label="Page ${pageCount}"]`);
      if (pageNo) {
        await pageNo.click();
        await this.delay(this.loadDelay);
      } else {
        console.log("No more page");
        return;
      }
      let ids = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll("ul.scaffold-layout__list-container li"),
          (element) => element.id
        )
      );
      ids = ids.filter((id) => id);
      console.log(`No of items in page ${pageCount}: ${ids.length}`);
      const maxNext = 15;
      let jobTitle = null;

      for (let id of ids) {
        try {
          jobTitle = null;
          console.log("*Item id: " + id);
          const item = await page.$(`#${id}`);
          await item.click();
          await this.delay(this.loadDelay);
          jobTitle = await page.$eval(
            'h2[class="t-24 t-bold job-details-jobs-unified-top-card__job-title"]',
            (element) => element.textContent.trim()
          );
          console.log("Job title: ", jobTitle);
          if (jobTitle?.toLowerCase().includes("singaporeans only")) {
            console.log("Job for Singaporeans only, skipping...");
            continue;
          }
          const company = await page.$eval(
            'div[class="job-details-jobs-unified-top-card__primary-description-container"] div a',
            (element) => element.textContent.trim()
          );
          console.log("Company: ", company);
          if (
            company &&
            search.excludeCompanies?.some((ex) =>
              company.toLowerCase().includes(ex.toLowerCase())
            )
          ) {
            console.log("Company excluded: ", company);
            continue;
          }
          const didApply = await this.doApply(page);
          if (!didApply) {
            this.skipped++;
            console.log("Skipped to apply");
            continue;
          }
          let nextCount = 0;
          let isInvalid = false;
          do {
            const easyApplyModel = await this.easyApplyModel(page);
            if (easyApplyModel) {
              await this.setFields(page, search);
              await this.doNext(page, search, id);
              isInvalid = await this.hasInvalidFields(page);
              if (isInvalid) {
                console.log("Still has some invalid fields left to set");
                break;
              }
              nextCount++;
            } else {
              break;
            }
          } while (nextCount < maxNext && !isInvalid);

          if (isInvalid) {
            this.failed++;
            console.log("Could not complete this application.");
            await this.takeScreenshot(page, id);
            await this.dismiss(page);
            continue;
          } else {
            const postApplyDialog =
              (await page.$("#post-apply-modal")) ||
              (await page.$('div[role="dialog"]'));
            if (postApplyDialog) {
              await this.dismiss(page);
            }
            this.success++;
            if (search.connectRecruiter) {
              await this.connectRecruiter(page, browser, {
                title: jobTitle,
                company,
                applied: true,
              });
            }
          }
        } catch (err) {
          console.log("ERROR(easyApply): " + err);
          this.failed++;
          await this.dismiss(page);
          await this.connectRecruiter(page, browser, null);
        }
      }
      console.log("Status: ", {
        success: this.success,
        skipped: this.skipped,
        failed: this.failed,
      });
    }
  };
  applyAll = async () => {
    console.log("::applyAll");
    for (const search of jobSearch) {
      console.log("Job search name: ", search.name);
      if (!search.active) {
        console.log("Job not active to search");
        continue;
      }
      for (const location of search.locations) {
        for (const keyword of search.keywords) {
          console.log(">Searching: ", { keyword, location });
          let browser = null;
          try {
            browser = await puppeteer.launch({
              headless: false,
              // executablePath: "/path/to/chrome",
              defaultViewport: null,
              userDataDir: "./user_data",
              dumpio: true,
            });
            const page = await browser.newPage();
            await page.goto(
              `https://www.linkedin.com/jobs/search/?f_AL=true&keywords=${keyword}&location=${location}`
            );
            await this.delay(this.loadDelay);
            console.log(page);
            await this.easyApply(page, search, browser);
          } catch (err) {
            console.log("ERROR(applyAll): " + err);
          } finally {
            if (browser) {
              await browser.close();
              this.delay(this.clickDelay);
            } else {
              console.log("Browser not available to close");
            }
          }
          console.log(`End of keyword '${keyword}' for location '${location}'`);
          console.log("Status: ", {
            success: this.success,
            skipped: this.skipped,
            failed: this.failed,
          });
        }
        console.log(`End of location: '${location}'`);
      }
      console.log(`End of search: '${search.name}'`);
    }
    console.log("End of Job Search");
  };
}
const applier = new Applier();
applier.applyAll();
