# NH Bill Linker

Chrome Extension for automating responses to New Hampshire House and Senate
bills.

## Installation

### For Development/Testing

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile TypeScript
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" (top right)
6. Click "Load unpacked" and select the project directory

### For End Users

The extension is available on the Chrome Web Store (coming soon after initial review).

## Usage

Add query parameters to the URL to automatically populate and navigate the testimony form:

### URL Parameters

- **`date`** (string) - Date to select from the calendar in `MMDD` or `MDD` format
  - Examples: `date=0129` (January 29th), `date=129` (January 29th), `date=1215` (December 15th)
  - Optional, but required to proceed to committee selection

- **`committee`** (string) - Committee name to select
  - Examples: `committee=House Commerce and Consumer Affairs` or `committee=Commerce`
  - Supports partial matches (will select first match)
  - Requires a date to be selected first

- **`bill`** (string) - Bill number to select
  - Examples: `bill=HB1087`, `bill=SB100`, `bill=1087`, or `bill=100`
  - Matches bills by bill number (case-insensitive, supports partial bill numbers)
  - Requires a committee to be selected first

- **`role`** (string) - Your role (optional, defaults to "A Member of the Public")
  - Currently only supports "A Member of the Public"
  - Auto-selected, no input needed

- **`support`** (string) - Your position on the bill (optional)
  - Positive cases: `for`, `pro`, or `1` → selects "In Support"
  - Negative cases: `against`, `anti`, or `0` → selects "In Opposition"
  - Values are case-insensitive
  - Optional

### Example URLs

```url
https://gc.nh.gov/house/committees/remotetestimony/default.aspx?date=0129&committee=Commerce&bill=HB1087&support=for

https://gc.nh.gov/house/committees/remotetestimony/default.aspx?date=129&committee=Consumer Affairs&bill=1087&support=pro

https://gc.nh.gov/house/committees/remotetestimony/default.aspx?date=1215&committee=Finance&bill=SB100&support=against
```

## Development

### Build Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile automatically
- `npm run clean` - Remove compiled files

### Architecture

The extension uses Manifest V3 with the following key components:

- **Content Script** (`src/content-script.ts`): Runs in isolated context on gc.nh.gov pages, reads URL parameters, and orchestrates form population
- **Injected Script** (`src/injected.ts`): Runs in the page's MAIN context to access the native `__doPostBack()` function
- **CustomEvent Messaging**: Content script and injected script communicate via CustomEvents to bridge the isolated/MAIN context boundary

### How It Works

1. User visits a gc.nh.gov URL with query parameters
2. Content script injects `injected.js` into the page context
3. Content script reads URL parameters
4. For each parameter:
   - **Date**: Finds the calendar link and calls `__doPostBack()` via CustomEvent
   - **Committee**: Waits for dropdown to populate, then selects the option
   - **Bill**: Waits for dropdown to populate, then selects the option
   - **Role**: Automatically selects "A Member of the Public"
   - **Support**: If provided, selects the radio button for "In Support" or "In Opposition"

### Privacy

This extension stores data **only locally** on your device using Chrome's storage API. No data is sent to external servers. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details.

## Initial Technical Approach

There is not a good way to link users directly to bills they want to respond
to. Everything basically dumps you to [the main page](https://gc.nh.gov/house/committees/remotetestimony/default.aspx) or provides a link to a
[bill's details](https://gc.nh.gov/bill_Status/billinfo.aspx?id=1817) that does
not get you near the place to respond.

### Selecting a Bill's Date

Responding consists of going to the main page, selecting the date of the bill
from the calendar inside `#dvSelectDate` by clicking link tags inside HTML
table row -> table cells that have no easily identifiable selector, so we
will need to fall back to something like `#dvSelectDate tr > td > a` for
the `<a>` tags where the content consists entirely of an integer between 1 and

Clicking the link tag calls a JavaScript function on the page. These links look
like `<a href="javascript:__doPostBack('ctl00$pageBody$calHearingDate','9494')" style="color:#C5C5C5" title="December 29">29</a>` where `'9494'` is some kind of
day identifier. Rather than simulating the click, it may (or may not) be easier
to call the function directly.

### Selecting the Committee

Clicking a valid date (or calling the function) populates an HTML `<select>` tag
with the CSS id `pageBody_ddlCommittee` with a set of committees holding hearings
that day. The HTML options look like `<option value="29">House Commerce and Consumer Affairs</option>` where I assume `29` is a unique identifier for a given committee.
We may be able to find a static list of these, but they could expand or contract
over time so doing it by name may be more flexible, though it means dealing with
spaces. We could also assume we will use shorthand and thus match the first option
that contains the text, so both `House Commerce and Consumer Affairs` and
`Consumer Affairs` would both work. In this case, simulating a click on the
relevant HTML option is most likely easiest to fire the callback handler on the
select element. Abstract this logic out to a function that can work on any
HTML Select tag we specify given an id and a value as this will need to be done
multple times. Including when . . .

### Selecting the Bill

The prior step populated a select tag with the ID `#pageBody_ddlBills` with a
list of option tags representing the bills being heard that day by that
committee. These options look like
`<option value="1771" title="relative to citizen's arrests by private persons.">10:00 am - HB1087</option>`
Sadly, the `value` does not have anything to do with the bill id so we will
need to match on a substring of the text in the option. Bills should be of the
form `HB####` for house bills and similar for Senate bills. Let's assume we will
have the bill number and match on the option who's text/ innherHTML has that at
the end of its string.

### Selecting Your Role

This is another HTML select, identified by `#pageBody_ddlWho`. Click the option
tag with the value of `4` to default to "A Member of the Public".

### Identifying Your Support

This final step should be optional. We will look for a `&support=X` in the querystring
where the two possible values are "for" and "against". If the value is present,
"for" would require a click on the radio button `#pageBody_rdoPosition_0` and "against"
would be a click on the radio button `#pageBody_rdoPosition_1`.

And that's it. We are not going to auto-submit the form because that feels spammy
and possibly illegal and do you know the difference between breaking the law
and a sick bird?
