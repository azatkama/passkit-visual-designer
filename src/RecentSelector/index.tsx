import * as React from "react";
import JSZip from "jszip";
import * as Store from "@pkvd/store";
import { GithubLogoDarkMode, AddIcon } from "./icons";
import localForage from "localforage";
import { createClassName } from "../utils";
import { StateLookalike } from "../App";
import { PassKind } from "../model";
import { CSSTransition } from "react-transition-group";

interface Props {
	recentProjects: Store.Forage.ForageStructure["projects"];
	requestForageDataRequest(): Promise<void>;
	initStore(projectID: string): Promise<void>;
	pushHistory(path: string, init?: Function): void;
	processUploadedFile(event: React.FormEvent<HTMLInputElement>): void;
	isProcessingZipFile: boolean;
	selectUrl: string;
	creatorUrl: string;
}

interface State {
	previewsURLList: { [projectID: string]: string };
	editMode: boolean;
	refreshing: boolean;
	showError: boolean;
}

export default class RecentSelector extends React.Component<Props, State> {
	private refreshInterval: number;
	private delayLoadingAnimationTimeout: number;
	private errorMessage: string = "";

	constructor(props: Props) {
		super(props);

		this.state = {
			previewsURLList: {},
			editMode: false,
			refreshing: false,
			showError: false,
		};

		this.switchEditMode = this.switchEditMode.bind(this);
		this.selectRecent = this.selectRecent.bind(this);
		this.toggleRefreshing = this.toggleRefreshing.bind(this);
		this.toggleErrorOverlay = this.toggleErrorOverlay.bind(this);
	}

	async componentDidMount() {
		this.refreshInterval = window.setInterval(async () => {
			try {
				this.toggleRefreshing();

				await Promise.all([
					this.props.requestForageDataRequest(),
					new Promise(
						(resolve) => (this.delayLoadingAnimationTimeout = window.setTimeout(resolve, 2000))
					),
				]);
			} finally {
				this.toggleRefreshing();
			}
		}, 7000);
	}

	static getDerivedStateFromProps(props: Props, state: State) {
		const newState = { ...state };

		const allProjectsIDs = [
			...new Set([...Object.keys(state.previewsURLList), ...Object.keys(props.recentProjects)]),
		];

		newState.previewsURLList = allProjectsIDs.reduce((acc, current) => {
			if (!props.recentProjects[current]) {
				URL.revokeObjectURL(state.previewsURLList[current]);
				/** When a projects gets removed*/
				return acc;
			}

			if (state.previewsURLList[current]) {
				return {
					...acc,
					[current]: state.previewsURLList[current],
				};
			}

			return {
				...acc,
				[current]: URL.createObjectURL(
					new Blob([props.recentProjects[current].preview], { type: "image/*" })
				),
			};
		}, {});

		if (!Object.keys(newState.previewsURLList).length) {
			newState.editMode = false;
		}

		return newState;
	}

	componentWillUnmount() {
		clearInterval(this.refreshInterval);
		clearTimeout(this.delayLoadingAnimationTimeout);
		Object.values(this.state.previewsURLList).forEach(URL.revokeObjectURL);
	}

	toggleRefreshing() {
		this.setState((previous) => ({
			refreshing: !previous.refreshing,
		}));
	}

	switchEditMode() {
		this.setState((previous) => ({
			editMode: !previous.editMode,
		}));
	}

	async removeProject(id: string) {
		const projects = await localForage.getItem<Store.Forage.ForageStructure["projects"]>(
			"projects"
		);

		delete projects[id];

		await localForage.setItem("projects", projects);
		this.props.requestForageDataRequest();
	}

	async selectRecent(id: string) {
		this.props.pushHistory(this.props.creatorUrl, () => this.props.initStore(id));
	}

	/**
	 * Shows or hides error message. We want to
	 * show it before opening animation and remove
	 * it after closing animation.
	 *
	 * @param errorMessage
	 */

	toggleErrorOverlay(errorMessage: string = "") {
		if (!this.errorMessage) {
			this.errorMessage = errorMessage;
		}

		this.setState(
			(previous) => ({
				showError: !previous.showError,
			}),
			() => {
				if (!errorMessage) {
					this.errorMessage = errorMessage;
				}
			}
		);
	}

	render() {
		const deleteButtonClassName = createClassName(["delete"], {
			open: this.state.editMode,
		});

		const savedProjects = Object.entries(this.props.recentProjects).map(([id, { snapshot }]) => {
			const alt = `Preview of project named ${snapshot.projectOptions.title || ""} (${id})`;

			return (
				<li key={id}>
					<div className="left" onClick={() => this.selectRecent(id)}>
						<img alt={alt} src={this.state.previewsURLList[id]} />
						<span>{snapshot.projectOptions.title || "Untitled project"}</span>
					</div>
					<div className="right">
						<span className={deleteButtonClassName} onClick={() => this.removeProject(id)}>
							Delete
						</span>
					</div>
				</li>
			);
		});

		return (
			<div id="recent-selector">
				<main>
					<CSSTransition in={this.state.showError} timeout={1000} unmountOnExit mountOnEnter>
						<div className="error-area" onClick={() => this.toggleErrorOverlay()}>
							<div id="error-box" onClick={(e) => e.stopPropagation()}>
								<h2>Import error</h2>
								<span>{this.errorMessage}</span>
							</div>
						</div>
					</CSSTransition>
					<div className="centered-column">
						<section>
							<div id="choices-box" className={this.props.isProcessingZipFile ? "loading" : ""}>
								<div
									onClick={() =>
										!this.props.isProcessingZipFile && this.props.pushHistory(this.props.selectUrl)
									}
								>
									<AddIcon width="32px" height="32px" />
									<span>Create Project</span>
								</div>
								<label htmlFor="zip-upload">
									<AddIcon width="32px" height="32px" />
									<span>Upload pass</span>
									<input
										hidden
										type="file"
										accept=".zip,.pkpass"
										id="zip-upload"
										disabled={this.props.isProcessingZipFile}
										onChange={this.props.processUploadedFile}
									/>
									<sub>Supported types: .zip, .pkpass</sub>
								</label>
							</div>
						</section>
						<section>
							<div className="recents-box">
								<header className={this.state.refreshing ? "refreshing" : null}>
									<h2>Recent Projects</h2>
									<button
										disabled={!savedProjects.length}
										onClick={this.switchEditMode}
										className={this.state.editMode ? "editing" : ""}
									>
										{this.state.editMode ? "Done" : "Edit"}
									</button>
								</header>
								<main>
									{(savedProjects.length && <ul>{savedProjects}</ul>) || (
										<span>
											No recent projects yet. Local recent projects will appear here below.
										</span>
									)}
								</main>
							</div>
						</section>
					</div>
				</main>
			</div>
		);
	}
}
