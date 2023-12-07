const fs = require("fs");
var qnas = require("./resources/qnas.json");

const puppeteer = require("puppeteer");
const keywords = ["java full stack"];
const tncQuesPhrases = [
  "BY CHECKING THIS BOX, YOU WILL DECLARE THAT YOU READ ",
  "Please check this box to confirm your acknowledgement of our Privacy policy ",
  "I agree to share my ",
  "indicate that you agree to ",
  "I agree to share my ",
];
const locations = ["Singapore"];
const expSalYr = {
  Australia: "120000",
  Singapore: "100000",
  "European Union": "80000",
};
const expSalMn = {
  Australia: "10000",
  Singapore: "8500",
  "European Union": "7000",
};
const currSalYr = { Singapore: "120000", "European Union": "100000" };
const currSalMn = { Singapore: "10000", "European Union": "7000" };
const excludeCompanies = ["Avensys Consulting"];

class Applier {
  loadDelay = 2000;
  clickDelay = 1000;
  inputDelay = 500;
  success = 0;
  skipped = 0;
  failed = 0;
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
  getAns = (ques, location) => {
    console.log("::getAns");
    const quesLower = ques.toLowerCase();
    if (
      quesLower.includes("salary") ||
      quesLower.includes("salry") ||
      quesLower.includes("remuneration")
    ) {
      return this.getSal(ques, location);
    }
    return qnas[ques];
  };
  getSal = (salaryQues, location) => {
    console.log("::getSal");
    let ques = salaryQues.toLowerCase();
    if (ques.includes("expect") || ques.includes("desired")) {
      if (ques.includes("year") || ques.includes("annual")) {
        return expSalYr[location];
      } else {
        return expSalMn[location];
      }
    }
    if (ques.includes("current") || ques.includes("drawn")) {
      if (ques.includes("year") || ques.includes("annual")) {
        return currSalYr[location];
      } else {
        return currSalMn[location];
      }
    }
    return qnas[salaryQues];
  };
  hasInvalidFields = async (page) => {
    return (
      (await page.$(`div[aria-invalid="true"]`)) ||
      (await page.$(`fieldset[aria-invalid="true"]`)) ||
      (await page.$(`li-icon[type="error-pebble-icon"]`))
    );
  };
  setFields = async (page, location) => {
    console.log("::setFields");

    return (
      (await this.enterAllTextField(page, location)) &&
      (await this.selectAllRadioBtn(page)) &&
      (await this.selectAllDropDown(page))
    );
  };
  // selectRadioBtn = async (page) => {
  //   console.log("::selectRadioBtn");
  //   const invalids = await page.$$('li-icon[type="error-pebble-icon"]');
  //   let unknownQuest = [];
  //   for (const invalid of invalids) {
  //     try {
  //       const ques = await invalid.$eval(
  //         'legend span[aria-hidden="true"]',
  //         (element) => element.textContent.trim()
  //       );
  //       // const isTnCQues = tncQuesPhrases.filter((phrase) => // ques.toLowerCase().includes(phrase.toLowerCase())  // ).length;
  //       const isTnCQues = tncQuesPhrases.some((phrase) =>
  //         ques.toLowerCase().includes(phrase.toLowerCase())
  //       );
  //       if (isTnCQues) {
  //         let chkBox = await invalid.$(`fieldset div input[type="checkbox"]`);
  //         await chkBox.click();
  //         await this.delay(this.clickDelay);
  //       } else {
  //         const ans = this.getAns(ques);
  //         console.log(ques, " : ", ans);
  //         if (ans) {
  //           let option = await invalid.$(`fieldset div input[value="${ans}"]`);
  //           if (option) {
  //             await option.click();
  //             await this.delay(this.clickDelay);
  //             continue;
  //           }
  //           let options = await invalid.$$(
  //             `div[class="fb-radio-buttons"] div label span`
  //           );
  //           for (const op of options) {
  //             const label = await page.evaluate((el) => el.innerText, op);
  //             if (label.toLowerCase() === ans.toLowerCase()) {
  //               await op.click();
  //               await this.delay(this.clickDelay);
  //               break;
  //             }
  //           }
  //         } else {
  //           const options = await invalid.$$eval(
  //             `fieldset div label`,
  //             (options) => options.map((option) => option.innerText).join("/")
  //           );
  //           unknownQuest.push({ [ques]: options });
  //           await this.saveQueses([{ [ques]: options }]);
  //         }
  //       }
  //     } catch (error) {
  //       console.log("ERROR(selectRadioBtn): ", error);
  //     }
  //   }
  //   console.log("unknownQuest.length: ", unknownQuest.length);
  //   // if (unknownQuest.length) {
  //   //     await this.saveQueses(unknownQuest);
  //   // }
  // };
  selectAllRadioBtn = async (page) => {
    console.log("::selectRadioBtn");
    const radioBtns = await page.$$(
      'fieldset[data-test-form-builder-radio-button-form-component="true"]'
    );
    let unknownQuest = [];
    for (const radioBtn of radioBtns) {
      try {
        const ques = await radioBtn.$eval(
          'legend span[aria-hidden="true"]',
          (element) => element.textContent.trim()
        );
        // const isTnCQues = tncQuesPhrases.filter((phrase) => // ques.toLowerCase().includes(phrase.toLowerCase())  // ).length;
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
              // continue;
            }
            // let options = await invalid.$$(
            //   `div[class="fb-radio-buttons"] div label span`
            // );
            // for (const op of options) {
            //   const label = await page.evaluate((el) => el.innerText, op);
            //   if (label.toLowerCase() === ans.toLowerCase()) {
            //     await op.click();
            //     await this.delay(this.clickDelay);
            //     break;
            //   }
            // }
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
    // if (unknownQuest.length) {
    //     await this.saveQueses(unknownQuest);
    // }
    return unknownQuest.length == 0;
  };
  // enterTextField = async (page, location) => {
  //   console.log("::enterTextField");
  //   const invalids = await page.$$("input[required]");
  //   let unknownQuest = [];
  //   for (const invalid of invalids) {
  //     try {
  //       const ques = await invalid.$eval(
  //         'div div div label[class="artdeco-text-input--label"',
  //         (element) => element.textContent.trim()
  //       );
  //       const ans = this.getAns(ques, location);
  //       console.log(ques, " : ", ans);
  //       if (ans) {
  //         const cmbBox = await invalid.$('div input[role="combobox"]');
  //         if (cmbBox) {
  //           await cmbBox.type(ans);
  //           await this.delay(this.clickDelay);
  //           const optionLi = await invalid.$(`div div div ul li`);
  //           await optionLi.click();
  //           await this.delay(this.inputDelay);
  //           continue;
  //         }
  //         const txt = await invalid.$('div input[type="text"]');
  //         if (txt) {
  //           await txt.type(ans);
  //           await this.delay(this.inputDelay);
  //           continue;
  //         }
  //         const txtArea = await invalid.$(
  //           'div[class="fb-multi-line-text"] div div textarea[name="multiLineText"]'
  //         );
  //         if (txtArea) {
  //           await txtArea.type(ans);
  //           await this.delay(this.inputDelay);
  //           continue;
  //         }
  //       } else {
  //         unknownQuest.push({ [ques]: null });
  //         if (unknownQuest.length) {
  //           await this.saveQueses([{ [ques]: null }]);
  //         }
  //       }
  //     } catch (error) {
  //       console.log("ERROR(enterTextField): ", error);
  //     }
  //   }
  //   console.log("unknownQuest.length: ", unknownQuest.length);
  //   // if (unknownQuest.length) {
  //   //     await this.saveQueses(unknownQuest);
  //   // }
  // };
  enterAllTextField = async (page, location) => {
    console.log("::enterTextField");
    const textFields = await page.$$(
      "div [data-test-single-line-text-form-component]"
    );
    let unknownQuest = [];
    for (const textField of textFields) {
      try {
        const ques = await textField.$eval("label", (element) =>
          element.textContent.trim()
        );
        const ans = this.getAns(ques, location);
        console.log(ques, " : ", ans);
        if (ans) {
          // const cmbBox = await invalid.$('div input[role="combobox"]');
          // if (cmbBox) {
          //   await cmbBox.type(ans);
          //   await this.delay(this.clickDelay);
          //   const optionLi = await invalid.$(`div div div ul li`);
          //   await optionLi.click();
          //   await this.delay(this.inputDelay);
          //   continue;
          // }
          const txt = await textField.$("input");
          if (txt) {
            await txt.click({ clickCount: 3 });
            await this.delay(this.inputDelay);
            await txt.type(ans);
            await this.delay(this.inputDelay);
            // continue;
          }
          // const txtArea = await invalid.$(
          //   'div[class="fb-multi-line-text"] div div textarea[name="multiLineText"]'
          // );
          // if (txtArea) {
          //   await txtArea.type(ans);
          //   await this.delay(this.inputDelay);
          //   continue;
          // }
        } else {
          unknownQuest.push({ [ques]: null });
          if (unknownQuest.length) {
            await this.saveQueses([{ [ques]: null }]);
          }
        }
      } catch (error) {
        console.log("ERROR(enterTextField): ", error);
      }
    }
    console.log("unknownQuest.length: ", unknownQuest.length);
    // if (unknownQuest.length) {
    //     await this.saveQueses(unknownQuest);
    // }
    return unknownQuest.length == 0;
  };
  // selectDropDown = async (page) => {
  //   console.log("::selectDropDown");
  //   const invalids = await page.$$('select[aria-required="true"]');
  //   let unknownQuest = [];
  //   for (const invalid of invalids) {
  //     try {
  //       const ques = await invalid.$eval(
  //         'div label span[aria-hidden="true"]',
  //         (element) => element.textContent.trim()
  //       );
  //       const ans = this.getAns(ques);
  //       console.log(ques, " : ", ans);
  //       if (ans) {
  //         const ddl = await invalid.$('div select[aria-required="true"]');
  //         if (ddl) {
  //           const options = await ddl.$$("option");
  //           for (const option of options) {
  //             let label = await page.evaluate((el) => el.innerText, option);
  //             label = label
  //               .replace(/\s\s+/g, " ")
  //               .replace("\n ", "")
  //               .replace("\n", "")
  //               .trim();
  //             if (label.toLowerCase() === ans.toLowerCase()) {
  //               const value = await page.evaluate((el) => el.value, option);
  //               await ddl.select(value);
  //               await this.delay(this.clickDelay);
  //               break;
  //             }
  //           }
  //         }
  //       } else {
  //         const ddl = await invalid.$('div select[aria-required="true"]');
  //         if (ddl) {
  //           let options = await ddl.$$eval("option", (options) =>
  //             options.map((option) => option.innerText).join("/")
  //           );
  //           options = options
  //             .replace(/\s\s+/g, " ")
  //             .replace("\n ", "")
  //             .replace("\n", "")
  //             .replaceAll(" / ", "/")
  //             .trim();
  //           unknownQuest.push({ [ques]: options });
  //           if (unknownQuest.length) {
  //             await this.saveQueses([{ [ques]: options }]);
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.log("ERROR(enterTextField): ", error);
  //     }
  //   }
  //   console.log("unknownQuest.length: ", unknownQuest.length);
  //   // if (unknownQuest.length) {
  //   //     await this.saveQueses(unknownQuest);
  //   // }
  // };
  selectAllDropDown = async (page) => {
    console.log("::selectDropDown");
    const ddls = await page.$$(
      "div [data-test-text-entity-list-form-component]"
    );
    let unknownQuest = [];
    for (const ddl of ddls) {
      try {
        const ques = await ddl.$eval(
          'label span[aria-hidden="true"]',
          (element) => element.textContent.trim()
        );
        const ans = this.getAns(ques);
        console.log(ques, " : ", ans);
        if (ans) {
          const select = await ddl.$("select");
          if (select) {
            const options = await select.$$("option");
            for (const option of options) {
              let label = await page.evaluate((el) => el.innerText, option);
              label = label
                .replace(/\s\s+/g, " ")
                .replace("\n ", "")
                .replace("\n", "")
                .trim();
              if (label.toLowerCase() === ans.toLowerCase()) {
                const value = await page.evaluate((el) => el.value, option);
                await select.select(value);
                await this.delay(this.inputDelay);
                break;
              }
            }
          }
        } else {
          const ddl = await ddl.$('div select[aria-required="true"]');
          if (ddl) {
            let options = await ddl.$$eval("option", (options) =>
              options.map((option) => option.innerText).join("/")
            );
            options = options
              .replace(/\s\s+/g, " ")
              .replace("\n ", "")
              .replace("\n", "")
              .replaceAll(" / ", "/")
              .trim();
            unknownQuest.push({ [ques]: options });
            if (unknownQuest.length) {
              await this.saveQueses([{ [ques]: options }]);
            }
          }
        }
      } catch (error) {
        console.log("ERROR(enterTextField): ", error);
      }
    }
    console.log("unknownQuest.length: ", unknownQuest.length);
    // if (unknownQuest.length) {
    //     await this.saveQueses(unknownQuest);
    // }
    return unknownQuest.length == 0;
  };

  doApply = async (page) => {
    console.log("::doApply");
    let easyApplyBtn = await page.$("div.jobs-apply-button--top-card button");
    console.log("Easy Apply Button: " + easyApplyBtn);
    if (!easyApplyBtn) {
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

    // let nextCount = 0;
    // console.log("Next Button: " + nextBtn);
    // while (nextBtn && nextCount < 10) {
    //   await nextBtn.click();
    //   await this.delay(this.clickDelay);
    //   let invalids = await this.hasInvalidFields(page);
    //   if (invalids) {
    //     await this.setFields(page, location);
    //     await this.delay(this.inputDelay);
    //     invalids = await this.hasInvalidFields(page);
    //     if (invalids) {
    //       await page.screenshot({ path: `screenshots/${id}.png` });
    //       await this.dismiss(page);
    //       return false;
    //     }
    //   }
    //   nextBtn = await page.$(nextBtnSelector);
    //   console.log("Next Button: " + nextBtn);
    //   nextCount++;
    // }
    // let invalids = await this.hasInvalidFields(page);
    // if (invalids) {
    //   await page.screenshot({ path: `screenshots/${id}.png` });
    //   await this.dismiss(page);
    //   return false;
    // }
    return true;
  };
  doReview = async (page, location, id) => {
    console.log("::doReview");
    const reviewBtnSelector = 'button[aria-label="Review your application"]';
    let reviewBtn = await page.$(reviewBtnSelector);
    await reviewBtn.click();
    await this.delay(this.clickDelay);

    // let reviewCount = 0;
    // console.log("Review Button: " + reviewBtn);
    // while (reviewBtn && reviewCount < 5) {
    //   await reviewBtn.click();
    //   await this.delay(this.clickDelay);
    //   let invalids = await this.hasInvalidFields(page);
    //   if (invalids) {
    //     await this.setFields(page, location);
    //     await this.delay(this.inputDelay);
    //     invalids = await this.hasInvalidFields(page);
    //     if (invalids) {
    //       await page.screenshot({ path: `screenshots/${id}.png` });
    //       await this.dismiss(page);
    //       return false;
    //     }
    //   }
    //   reviewBtn = await page.$(reviewBtnSelector);
    //   console.log("Review Button: " + reviewBtn);
    //   reviewCount++;
    // }
    // let invalids = await this.hasInvalidFields(page);
    // if (invalids) {
    //   await page.screenshot({ path: `screenshots/${id}.png` });
    //   await this.dismiss(page);
    //   return false;
    // }
    // return true;
  };
  doSubmit = async (page) => {
    console.log("::doSubmit");
    const submitBtn = await page.$('button[aria-label="Submit application"]');
    await submitBtn.click();
    await this.delay(this.loadDelay);
  };
  connectRecruiter = async (mainPage, browser) => {
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
        const name = await profilePage.$eval(
          "main section div div div div h1",
          (e) => e.innerText
        );
        console.log("name: ", name);
        // let connectBtn = await profilePage.$(`div[class="pvs-profile-actions "] div[class="pvs-profile-actions__action"] button[aria-label="Invite ${name} to connect"]`);
        let connectBtns = await profilePage.$$(
          `button[aria-label="Invite ${name} to connect" `
        );
        let connectBtn = null;
        if (connectBtns) {
          connectBtn = connectBtns[connectBtns.length - 1];
        }
        if (!connectBtn) {
          //connectBtn = await profilePage.$(`button[aria-label="Invite ${name} to connect"]`);
          //const moreBtn = await profilePage.$('div[class="pvs-profile-actions "] div button[aria-label="More actions"]');
          const moreBtns = await profilePage.$$(
            'button[aria-label="More actions"]'
          );
          let moreBtn = null;
          if (moreBtns) {
            moreBtn = moreBtns[moreBtns.length - 1];
          }
          // if(moreBtns && moreBtns.length && moreBtns. )
          if (moreBtn) {
            await moreBtn.click();
            await this.delay(this.clickDelay);
          }
          let connectBtn2 = await profilePage.$(
            'div[class="pvs-profile-actions "] div div div ul li div[role="button"] li-icon[type="connect"]'
          );
          connectBtn = await profilePage.$(
            `div[aria-hidden="false"] div ul div[aria-label="Invite ${name} to connect"]`
          );
        }
        if (connectBtn) {
          await connectBtn.click();
          await this.delay(this.loadDelay);
          const inviteModel = await profilePage.$("#send-invite-modal");
          if (inviteModel) {
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

  easyApply = async (page, location, browser) => {
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
      // await this.delay(this.clickDelay);
      ids = ids.filter((id) => id);
      console.log(`No of items in page ${pageCount}: ${ids.length}`);
      const maxNext = 10;
      for (let id of ids) {
        try {
          console.log("*Item id: " + id);
          const item = await page.$(`#${id}`);
          await item.click();
          await this.delay(this.loadDelay);
          // await this.connectRecruiter(page, browser);
          const title = await page.$eval(
            'h2[class="t-24 t-bold job-details-jobs-unified-top-card__job-title"]',
            (element) => element.textContent.trim()
          );
          console.log("Job title: ", title);
          const company = await page.$eval(
            'div[class="job-details-jobs-unified-top-card__primary-description-container"] div',
            (element) => element.textContent.trim()
          );
          console.log("Company: ", company);
          // let excludeCompany = false;
          // for (let companyExc of excludeCompanies) {
          //   if (company.toUpperCase().includes(companyExc.toUpperCase())) {
          //     console.log("Company excusion matched");
          //     excludeCompany = true;
          //   }
          // }

          // if (excludeCompany) {
          //   console.log("Company excluded");
          //   continue;
          // }

          const didApply = await this.doApply(page);
          if (!didApply) {
            this.skipped++;
            console.log("Skipped to apply");
            continue;
          }

          // const applySet = await this.setFields(page, location);
          // if (applySet) {
          // } else {
          //   console.log("Apply not set");
          //   this.failed++;
          //   continue;
          // }

          let nextCount = 0;
          let didNext = false;
          do {
            didNext = false;
            const nextSet = await this.setFields(page, location);
            if (nextSet) {
              didNext = await this.doNext(page, location, id);
              if (!didNext) {
                this.failed++;
                break;
              }
            } else {
              console.log("Next not set: ", nextCount);
              break;
            }
            nextCount++;
          } while (nextCount < maxNext && didNext);
          if (!didNext) {
            this.failed++;
            console.log("Next failed");
            await this.dismiss(page);
            continue;
          }

          // let reviewCount = 0;
          // let didReview = false;
          // do {
          //   const reviewSet = await this.setFields(page, location);
          //   if (reviewSet) {
          //     didReview = await this.doReview(page, location, id);
          //     if (!didReview) {
          //       this.failed++;
          //       break;
          //     }
          //   } else {
          //     console.log("Review not set: ", reviewCount);
          //     break;
          //   }
          //   reviewCount++;
          // } while (reviewCount < maxReview && didReview);
          // if (!didReview) {
          //   console.log("Review failed");
          //   this.failed++;
          //   await this.dismiss(page);
          //   continue;
          // }

          // const reviewSet = await this.setFields(page, location);
          // if (reviewSet) {
          //   const didReview = await this.doReview(page, location, id);
          //   if (!didReview) {
          //     this.failed++;
          //     continue;
          //   }
          // } else {
          //   console.log("Review not set");
          //   this.failed++;
          //   continue;
          // }

          // await this.doSubmit(page);
          const postApplyDialog = await page.$("#post-apply-modal");
          if (postApplyDialog) {
            await this.dismiss(page);
          }
          this.success++;
        } catch (err) {
          this.failed++;
          console.log("ERROR(easyApply): " + err);
          await this.dismiss(page);
        } finally {
          await this.connectRecruiter(page, browser);
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
    for (const keyword of keywords) {
      let browser = null;
      for (const location of locations) {
        console.log(">Visiting: ", { keyword, location });
        try {
          browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            userDataDir: "./user_data",
            dumpio: true,
          });
          const page = await browser.newPage();
          await page.goto(
            `https://www.linkedin.com/jobs/search/?f_AL=true&keywords=${keyword}&location=${location}`
            // { waitUntil: "domcontentloaded" }
          );
          await this.delay(this.loadDelay);
          console.log(page);
          await this.easyApply(page, location, browser);
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
      }
      console.log(`End of locations for '${keyword}'`);
      console.log("Status: ", {
        success: this.success,
        skipped: this.skipped,
        failed: this.failed,
      });
    }
    console.log("End of keywords");
    console.log("Status: ", {
      success: this.success,
      skipped: this.skipped,
      failed: this.failed,
    });
  };
}
const applier = new Applier();
applier.applyAll();
