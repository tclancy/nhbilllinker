# NH Bill Linker

This is a [Chrome extension](https://developer.chrome.com/docs/extensions/get-started)
to make it a bit easier to provide feedback on New Hampshire House and Senate
bills.

## Next Step

The next thing we need to do is the reverse of what we have done: because the
people sending these links will be non-technical, we want to make it simple for
them to copy the proper link rather than have to remember the various querystring
parameters. So:

Let's place icons/pen-writer-svgrepo-com.svg in the page in a fixed position
on the right, 3em from the top and right. It should be grayed-out and not
clickable to begin with. As a user selects the various form inputs we would
prepopulate, the icon should become clickable. Clicking on the icon should place
the pre-populated url in the user's clipboard. As each form input gets selected,
the url should update from the base url, `https://gc.nh.gov/house/committees/remotetestimony/default.aspx`,
adding `date=MMDD` once the user clicks the date, `committee` when the relevant
dropdown changes, etc. Essentially, reverse the operations in content-script.ts.

### After That

We need to be able to handle dates that are in future months for the form
prepopulation. Let's thrash that out later.
