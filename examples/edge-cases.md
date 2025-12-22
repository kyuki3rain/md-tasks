# Edge Cases Test

Tests various edge cases and special scenarios.

## Markdown Formatting in Titles

- [ ] **Bold text** in title
  - status: todo
- [ ] `inline code` in title
  - status: in-progress
- [ ] [Link to docs](https://example.com) in title
  - status: todo
- [ ] *Italic* and ~~strikethrough~~ text
  - status: done

## Duplicate Tasks (Warning Expected)

- [ ] Same task name
  - status: todo
- [ ] Same task name
  - status: in-progress

## Ignored Content

The following should NOT be recognized as tasks:

> Blockquote content:
> - [ ] This checkbox in blockquote should be ignored

```markdown
Code block:
- [ ] This checkbox in code block should be ignored
```

- Regular list item without checkbox
- Another regular item

## Invalid Metadata (Should be Ignored)

- [ ] Task with invalid metadata
  - status: todo
  - priority high
  - : empty key
  - note:
  - This is just a memo
  - valid-key: valid-value

## Root Level Tasks

No heading above these tasks:

- [ ] Root task 1
  - status: todo
- [x] Root task 2
  - status: done

## Special Characters

- [ ] Task with "quotes" and 'apostrophes'
  - status: todo
- [ ] Task with emoji!
  - status: in-progress
- [ ] Task with Japanese
  - status: todo

## Various Checkbox Formats

- [x] Lowercase x (completed)
- [X] Uppercase X (completed)
- [ ] Empty (not completed)
