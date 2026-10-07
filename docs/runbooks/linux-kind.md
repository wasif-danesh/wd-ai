# Runbook: kind on Linux with rootless Podman

`make kind-up` works on Linux, but kind inside **rootless** Podman needs cgroup v2 with
resource-controller delegation. Check and fix once per machine. (Also applies to WSL2 with
systemd enabled.)

Status: documented from the kind docs; not yet verified on a physical Linux host.

```bash
stat -fc %T /sys/fs/cgroup                 # must print cgroup2fs
cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers
```

The second command should list `cpu cpuset io memory pids`. If it does not:

```bash
sudo mkdir -p /etc/systemd/system/user@.service.d
printf '[Service]\nDelegate=yes\n' | sudo tee /etc/systemd/system/user@.service.d/delegate.conf
sudo systemctl daemon-reload
# then log out and back in (or reboot)
```

Then `make kind-up` as usual. If it still fails, run it rootful instead:

```bash
sudo -E env "PATH=$PATH" make kind-up
```

Docker as the engine avoids all of this: `CONTAINER_ENGINE=docker make kind-up`.
