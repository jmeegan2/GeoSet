# DART Versioning Scheme

The DART project leverages a `major.minor` versioning scheme. The _major_ version is set to the sprint number, and the _minor_ version is a running total of how many merge requests we've merged into _main_. We can think of these minor increments as _increments of value_. Ideally, these increments of value will tie to our sprint goals.

## Specifying the Version

The two components of the version are specified within the the [gitlab-ci.yaml](./.gitlab-ci.yml) file. The first five lines of this file are copied below for convenience.

```yaml
variables:
  # update the sprint number at the start of each sprint
  SPRINT_NUMBER: "29"
  # increment with each merge to main and reset to 0 at the start of each sprint
  VALUE_INCREMENT: "1"
```

Each new merge request should increment the `VALUE_INCREMENT` by 1. The first merge request created within a sprint should also increment the `SPRINT_NUMBER` by one. Upon merging, the build pipeline will build and tag the image as `<SPRINT_NUMBER>.<VALUE_INCREMENT>`.

If there are multiple outstanding merge requests, care must be taken to increment the `VALUE_INCREMENT` appropriately. If this proves to be too cumbersome, we can work on creating a mechanism to automatically increment this value.
